// /api/brands/{brandId}/quizzes/{quizId}
//   PUT    — saves the whole quiz from QuizEditor in one call: title, link,
//            published or not, its products, and its full question set.
//   PATCH  — the list's quick actions: publish/hide, make it the main quiz.
//   DELETE — removes the quiz with its questions and answers (cascade).
//            Its stats sessions stay, with quiz_id set null.
//
// canManageBrand()-checked, and every query is scoped to (quiz id, brand
// id) together, so a quiz id from another brand matches nothing.
//
// Questions are replaced the way the single-quiz route always did it: the
// NEW set is inserted first and the old one deleted only after that
// succeeds, so a failure leaves the old questions intact, never a wiped
// quiz. There is no transaction around the whole save — if questions fail
// after the title and products were written, the editor shows the error,
// stays dirty, and saving again writes the same values.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { canManageBrand, getSessionProfile } from "@/lib/auth";
import { QUIZ_SELECT, rowToQuiz } from "@/lib/data";

type Params = { params: { brandId: string; quizId: string } };

/** Lowercase Latin letters and digits in hyphen-separated groups. */
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const answerSchema = z.object({
  text_mn: z.string().min(1),
  text_en: z.string().optional(),
  category: z.string().min(1),
  points: z.number(),
});

const questionSchema = z.object({
  text_mn: z.string().min(1),
  text_en: z.string().optional(),
  answers: z.array(answerSchema),
});

const putSchema = z.object({
  title_mn: z.string().trim().min(1).max(200),
  title_en: z.string().trim().max(200).optional(),
  slug: z.string().max(40).regex(SLUG_RE),
  status: z.enum(["active", "inactive"]),
  productIds: z.array(z.string().uuid()),
  questions: z.array(questionSchema),
});

const patchSchema = z.object({
  status: z.enum(["active", "inactive"]).optional(),
  main: z.literal(true).optional(),
});

/** Ownership check plus "does this quiz belong to this brand". Returns an
 *  error response, or null when the caller may go ahead. */
async function authorize({ brandId, quizId }: Params["params"]) {
  const profile = await getSessionProfile();
  if (!canManageBrand(profile, brandId)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { data, error } = await supabaseAdmin
    .from("quizzes")
    .select("id")
    .eq("id", quizId)
    .eq("brand_id", brandId)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return null;
}

async function readQuiz(quizId: string) {
  const { data, error } = await supabaseAdmin.from("quizzes").select(QUIZ_SELECT).eq("id", quizId).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ quiz: rowToQuiz(data) });
}

export async function PUT(req: NextRequest, { params }: Params) {
  const denied = await authorize(params);
  if (denied) return denied;

  const json = await req.json().catch(() => null);
  const parsed = putSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const body = parsed.data;
  const { brandId, quizId } = params;

  // ---- Title, link, visibility ----
  const { error: metaError } = await supabaseAdmin
    .from("quizzes")
    .update({ title_mn: body.title_mn, title_en: body.title_en || null, slug: body.slug, status: body.status })
    .eq("id", quizId);
  if (metaError) {
    // unique (brand_id, slug)
    if (metaError.code === "23505") return NextResponse.json({ error: "slug_taken" }, { status: 409 });
    return NextResponse.json({ error: metaError.message }, { status: 500 });
  }

  // ---- Products ----
  // Keep only this brand's products that still exist; ids from anywhere
  // else are dropped rather than linked.
  let productIds: string[] = [];
  if (body.productIds.length > 0) {
    const { data: own, error: ownError } = await supabaseAdmin
      .from("products")
      .select("id")
      .eq("brand_id", brandId)
      .neq("status", "deleted")
      .in("id", body.productIds);
    if (ownError) return NextResponse.json({ error: ownError.message }, { status: 500 });
    productIds = own.map((p) => p.id);
  }

  const unlink = supabaseAdmin.from("quiz_products").delete().eq("quiz_id", quizId);
  const { error: unlinkError } = await (productIds.length > 0
    ? unlink.not("product_id", "in", `(${productIds.join(",")})`)
    : unlink);
  if (unlinkError) return NextResponse.json({ error: unlinkError.message }, { status: 500 });

  if (productIds.length > 0) {
    const { error: linkError } = await supabaseAdmin
      .from("quiz_products")
      .upsert(
        productIds.map((product_id) => ({ quiz_id: quizId, product_id })),
        { onConflict: "quiz_id,product_id", ignoreDuplicates: true }
      );
    if (linkError) return NextResponse.json({ error: linkError.message }, { status: 500 });
  }

  // ---- Questions ----
  // `order` comes from array position, never from the client; client-sent
  // ids are ignored and real ones come back in the response.
  if (body.questions.length === 0) {
    const { error } = await supabaseAdmin.from("quiz_questions").delete().eq("quiz_id", quizId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return readQuiz(quizId);
  }

  const { data: newQuestions, error: insertQError } = await supabaseAdmin
    .from("quiz_questions")
    .insert(
      body.questions.map((q, i) => ({
        brand_id: brandId,
        quiz_id: quizId,
        text_mn: q.text_mn,
        text_en: q.text_en || null,
        order: i,
      }))
    )
    .select("id");
  if (insertQError) return NextResponse.json({ error: insertQError.message }, { status: 500 });
  const newIds = newQuestions.map((q) => q.id);

  const answerRows = newQuestions.flatMap((row, qi) =>
    body.questions[qi].answers.map((a, ai) => ({
      question_id: row.id,
      text_mn: a.text_mn,
      text_en: a.text_en || null,
      category: a.category,
      points: a.points,
      order: ai,
    }))
  );
  if (answerRows.length > 0) {
    const { error: insertAError } = await supabaseAdmin.from("quiz_answers").insert(answerRows);
    if (insertAError) {
      // Take the new questions back out so the old set stays the only one.
      await supabaseAdmin.from("quiz_questions").delete().in("id", newIds);
      return NextResponse.json({ error: insertAError.message }, { status: 500 });
    }
  }

  const { error: deleteOldError } = await supabaseAdmin
    .from("quiz_questions")
    .delete()
    .eq("quiz_id", quizId)
    .not("id", "in", `(${newIds.join(",")})`);
  if (deleteOldError) {
    // Without this the quiz would hold both sets — a silently doubled quiz.
    await supabaseAdmin.from("quiz_questions").delete().in("id", newIds);
    return NextResponse.json({ error: deleteOldError.message }, { status: 500 });
  }

  return readQuiz(quizId);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const denied = await authorize(params);
  if (denied) return denied;

  const json = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  if (parsed.data.status) update.status = parsed.data.status;
  if (parsed.data.main) {
    // Main = first by order, so move this one in front of all the others.
    const { data: first, error } = await supabaseAdmin
      .from("quizzes")
      .select("order")
      .eq("brand_id", params.brandId)
      .order("order")
      .limit(1)
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    update.order = first.order - 1;
  }

  if (Object.keys(update).length > 0) {
    const { error } = await supabaseAdmin.from("quizzes").update(update).eq("id", params.quizId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return readQuiz(params.quizId);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const denied = await authorize(params);
  if (denied) return denied;

  const { error } = await supabaseAdmin.from("quizzes").delete().eq("id", params.quizId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
