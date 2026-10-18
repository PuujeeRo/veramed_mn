// POST /api/auth/logout — signs out the current session and clears the
// cookie. Uses the cookie-aware server client (lib/supabaseServer.ts) so
// the same cookie middleware.ts/Server Components read is the one cleared.

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export async function POST() {
  const supabase = createSupabaseServerClient();
  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}
