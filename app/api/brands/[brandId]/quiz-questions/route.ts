// PUT /api/brands/{brandId}/quiz-questions — replaces this brand's entire
// question set in one call, matching QuizEditor's own UX: adding, removing,
// reordering, and editing answers all happen client-side against local
// state, then one Save persists the whole array at once. canManageBrand()-
// checked, same as every other brand write route.
//
// `order` is always derived from array position server-side, never trusted
// from the client — QuizEditor already keeps it correct locally
// (moveQuestion), but re-deriving here is simpler than trusting two sources
// of truth to agree, and costs nothing since the whole array is being
// replaced anyway. Client-sent `id`s are ignored too: real UUIDs are
// assigned on insert below, and the response returns the saved rows (with
// their real ids) so the client can adopt them for the next save.
//
// No DB transaction wraps this (this app doesn't use any yet — see
// slot-purchases' approve/reject for the same non-transactional pattern).
// To avoid ever leaving a brand's quiz empty if something fails partway,
// the NEW set is inserted first and only deleted-from-old after that
// succeeds — a failure here leaves the old quiz intact, never a wiped one.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { canManageBrand, getSessionProfile } from "@/lib/auth";

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

const bodySchema = z.object({ questions: z.array(questionSchema) });

export async function PUT(req: NextRequest, { params }: { params: { brandId: string } }) {
  const profile = await getSessionProfile();
  if (!canManageBrand(profile, params.brandId)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { questions } = parsed.data;

  // Empty set is valid (a brand can clear its quiz down to nothing — QuizFlow
  // already handles zero questions as "not set up yet"). Skip straight to
  // deleting the old set; there's nothing to insert first.
  if (questions.length === 0) {
    const { error } = await supabaseAdmin.from("quiz_questions").delete().eq("brand_id", params.brandId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ questions: [] });
  }

  const { data: newQuestions, error: insertQError } = await supabaseAdmin
    .from("quiz_questions")
    .insert(
      questions.map((q, i) => ({
        brand_id: params.brandId,
        text_mn: q.text_mn,
        text_en: q.text_en || null,
        order: i,
      }))
    )
    .select("id, brand_id, text_mn, text_en, order");
  if (insertQError) {
    return NextResponse.json({ error: insertQError.message }, { status: 500 });
  }

  const answerRows = newQuestions.flatMap((row, qi) =>
    questions[qi].answers.map((a, ai) => ({
      question_id: row.id,
      text_mn: a.text_mn,
      text_en: a.text_en || null,
      category: a.category,
      points: a.points,
      order: ai,
    }))
  );

  interface SavedAnswerRow {
    id: string;
    question_id: string;
    text_mn: string;
    text_en: string | null;
    category: string;
    points: number;
    order: number;
  }
  let newAnswers: SavedAnswerRow[] = [];
  if (answerRows.length > 0) {
    const { data, error: insertAError } = await supabaseAdmin
      .from("quiz_answers")
      .insert(answerRows)
      .select("id, question_id, text_mn, text_en, category, points, order");
    if (insertAError) {
      // Roll back the questions we just inserted so a failed save doesn't
      // leave orphaned empty questions behind alongside the still-intact
      // old set (the delete below never runs if we return early here).
      await supabaseAdmin
        .from("quiz_questions")
        .delete()
        .in("id", newQuestions.map((q) => q.id));
      return NextResponse.json({ error: insertAError.message }, { status: 500 });
    }
    newAnswers = data;
  }

  const { error: deleteOldError } = await supabaseAdmin
    .from("quiz_questions")
    .delete()
    .eq("brand_id", params.brandId)
    .not("id", "in", `(${newQuestions.map((q) => q.id).join(",")})`);
  if (deleteOldError) {
    // Roll the new set back out, same as the answers-insert failure above.
    // Without this the brand is left holding BOTH sets — a silently
    // doubled quiz — which is a worse outcome than the save simply not
    // having happened, and the 500 gives no hint that it occurred.
    await supabaseAdmin
      .from("quiz_questions")
      .delete()
      .in("id", newQuestions.map((q) => q.id));
    return NextResponse.json({ error: deleteOldError.message }, { status: 500 });
  }

  const result = newQuestions.map((q) => ({
    id: q.id,
    brandId: q.brand_id,
    order: q.order,
    text_mn: q.text_mn,
    text_en: q.text_en ?? "",
    answers: newAnswers
      .filter((a) => a.question_id === q.id)
      .sort((a, b) => a.order - b.order)
      .map((a) => ({
        id: a.id,
        text_mn: a.text_mn,
        text_en: a.text_en ?? "",
        category: a.category,
        points: a.points,
      })),
  }));

  return NextResponse.json({ questions: result });
}
