// GET /api/auth/callback — Supabase's PKCE confirmation landing spot. The
// only flow that ends here is the account page's email change
// (supabase.auth.updateUser({ email }) with emailRedirectTo pointing at
// this URL). No locale segment, like every other API route.
//
// This route never creates a profiles row. There is no public signup —
// accounts come from scripts/seed-auth.mjs — so a confirmed user with no
// profile is not someone to provision, just someone to send back to /login
// (every gated route already treats "no profile" as "not signed in").

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const redirectTo = (path: string) => NextResponse.redirect(new URL(path, req.url));

  if (!code) return redirectTo("/login");

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) return redirectTo("/login");

  return redirectTo("/account");
}
