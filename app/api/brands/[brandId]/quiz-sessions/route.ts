// POST /api/brands/{brandId}/quiz-sessions — starts a `quiz_sessions` row
// ("a session starts the moment a visitor opens the quiz"). No
// auth: quiz takers are anonymous by design (locked decision). Returns the
// new row's id so the visitor's browser can later mark this same session
// completed (app/api/brands/[brandId]/quiz-sessions/[sessionId]/route.ts) —
// there's no other identity to correlate the two calls by.
//
// The body may name the quiz that was opened. It is only stored when it is
// one of this brand's quizzes; anything else is recorded as no quiz rather
// than refused, since the session still counts toward the brand's totals.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const bodySchema = z.object({ quizId: z.string().uuid().optional() });

export async function POST(req: NextRequest, { params }: { params: { brandId: string } }) {
  const json = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(json);
  const requested = parsed.success ? parsed.data.quizId : undefined;

  let quizId: string | null = null;
  if (requested) {
    const { data } = await supabaseAdmin
      .from("quizzes")
      .select("id")
      .eq("id", requested)
      .eq("brand_id", params.brandId)
      .maybeSingle();
    quizId = data?.id ?? null;
  }

  const { data, error } = await supabaseAdmin
    .from("quiz_sessions")
    .insert({ brand_id: params.brandId, quiz_id: quizId })
    .select("id")
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ sessionId: data.id }, { status: 201 });
}
