// POST /api/brands/{brandId}/quizzes — creates an empty quiz from a title.
// Questions and products are added afterwards in the quiz editor, which
// saves through ./[quizId]/route.ts.
//
// A new quiz starts hidden, like a new product: there is nothing to answer
// yet. It goes last in the order, so it never silently takes over /quiz.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { canManageBrand, getSessionProfile } from "@/lib/auth";
import { QUIZ_SELECT, rowToQuiz } from "@/lib/data";
import { slugify } from "@/lib/slug";

const bodySchema = z.object({
  title_mn: z.string().trim().min(1).max(200),
  title_en: z.string().trim().max(200).optional(),
});

export async function POST(req: NextRequest, { params }: { params: { brandId: string } }) {
  const profile = await getSessionProfile();
  if (!canManageBrand(profile, params.brandId)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { title_mn, title_en } = parsed.data;

  const { data: existing, error: listError } = await supabaseAdmin
    .from("quizzes")
    .select("slug, order")
    .eq("brand_id", params.brandId);
  if (listError) return NextResponse.json({ error: listError.message }, { status: 500 });

  // A readable link from the title, made unique with -2, -3… The manager
  // can change it in the editor.
  const taken = new Set(existing.map((q) => q.slug));
  const base = slugify(title_mn) || "quiz";
  let slug = base;
  for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;
  const order = existing.reduce((max, q) => Math.max(max, q.order), -1) + 1;

  const { data, error } = await supabaseAdmin
    .from("quizzes")
    .insert({ brand_id: params.brandId, slug, title_mn, title_en: title_en || null, status: "inactive", order })
    .select(QUIZ_SELECT)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ quiz: rowToQuiz(data) }, { status: 201 });
}
