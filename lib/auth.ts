// veramed — auth helpers, server-only.
//
// Wraps lib/supabaseServer.ts with the two checks every write route needs:
// "who is this" (getSessionProfile) and "may they manage the company"
// (canManageBrand). Route handlers call these directly rather than trusting
// middleware.ts alone — middleware guards page navigation, each API route
// re-checks for itself.
//
// Accounts are created by hand (scripts/seed-auth.mjs) — there is no public
// signup. A manager is a profiles row plus a brand_members row for the
// company; `admin` is the same thing without needing the membership row.

import { createSupabaseServerClient } from "./supabaseServer";
import { isSupabaseConfigured } from "./company";

export interface SessionProfile {
  userId: string;
  /** From auth.users, not profiles — there's no email column on profiles. */
  email: string | null;
  role: "brand_manager" | "admin";
  brandIds: string[];
  fullName: string | null;
  username: string | null;
}

/** Null if not signed in, or signed in but missing a profiles row. */
export async function getSessionProfile(): Promise<SessionProfile | null> {
  // No database yet → nobody can be signed in; skip the network call.
  if (!isSupabaseConfigured()) return null;
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, { data: memberships }] = await Promise.all([
    supabase.from("profiles").select("role, full_name, username").eq("id", user.id).single(),
    supabase.from("brand_members").select("brand_id").eq("user_id", user.id),
  ]);
  if (!profile) return null;

  return {
    userId: user.id,
    email: user.email ?? null,
    role: profile.role,
    brandIds: (memberships ?? []).map((m) => m.brand_id),
    fullName: profile.full_name,
    username: profile.username,
  };
}

export function canManageBrand(profile: SessionProfile | null, brandId: string): boolean {
  if (!profile) return false;
  return profile.role === "admin" || profile.brandIds.includes(brandId);
}
