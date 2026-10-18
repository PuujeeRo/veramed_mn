// POST /api/brands/{brandId}/quiz-sessions — starts a `quiz_sessions` row
// ("a session starts the moment a visitor opens the quiz"). No
// auth: quiz takers are anonymous by design (locked decision). Returns the
// new row's id so the visitor's browser can later mark this same session
// completed (app/api/brands/[brandId]/quiz-sessions/[sessionId]/route.ts) —
// there's no other identity to correlate the two calls by.

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(_req: NextRequest, { params }: { params: { brandId: string } }) {
  const { data, error } = await supabaseAdmin
    .from("quiz_sessions")
    .insert({ brand_id: params.brandId })
    .select("id")
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ sessionId: data.id }, { status: 201 });
}
