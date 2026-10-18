// veramed — SERVER-ONLY Supabase client with cookie-based sessions
//. Uses the anon/publishable key (RLS still applies) — unlike
// lib/supabaseAdmin.ts, this client acts AS the signed-in user, which is
// what lets the "users read own profile" and brand/product write RLS
// policies (supabase/schema.sql) actually key off auth.uid().
//
// Only call this from Server Components, Route Handlers, or middleware —
// it reads/writes the session cookie via next/headers, which does not
// exist in the browser. For the login form itself, see lib/supabaseBrowser.ts.

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export function createSupabaseServerClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "http://localhost:54321",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key",
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Called from a Server Component render, which can't set
            // cookies — middleware.ts is what actually refreshes the
            // session cookie on each request. Safe to ignore here.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {
            // Same as above.
          }
        },
      },
    }
  );
}
