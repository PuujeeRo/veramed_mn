"use client";

// veramed — browser Supabase client with COOKIE-based sessions.
//
// Deliberately separate from lib/supabase.ts: that client stores its
// session in localStorage (fine for the anon-key-only public reads it's
// used for today), which middleware.ts and Server Components can't see.
// This one (createBrowserClient) writes the same cookie format
// lib/supabaseServer.ts reads, so a sign-in here is visible to the next
// server-rendered request. Only used by the login form and the logout
// button — everything else keeps reading through lib/supabase.ts.

import { createBrowserClient } from "@supabase/ssr";

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "http://localhost:54321",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key"
  );
}
