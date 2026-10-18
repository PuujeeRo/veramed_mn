// veramed — browser Supabase client.
//
// Anon key only — safe to ship to the browser. RLS (supabase/schema.sql)
// restricts this to read-only until Phase 5 adds real auth: `select` is
// public, there are no insert/update/delete policies for the anon role.
// Writes go through the Next.js API routes in app/api/*, which use
// lib/supabaseAdmin.ts instead.

import { createClient } from "@supabase/supabase-js";

// Placeholder fallbacks so a missing env var fails at the moment a query
// actually runs (a normal network/auth error) rather than crashing
// `next build`'s page-data collection, which imports every route module —
// including ones that construct this client at module scope — regardless
// of whether the env vars needed at runtime are set yet.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "http://localhost:54321",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key"
);
