// veramed — SERVER-ONLY Supabase client.
//
// Uses the service_role key, which bypasses Row Level Security entirely.
// Never import this from a "use client" file or any code that ships to
// the browser — that would hand out full read/write access to every
// table, defeating the RLS policies in supabase/schema.sql. Only
// app/api/**/route.ts handlers (which run server-side) should import this.
//
// This is NOT real authorization on its own — it just means writes happen
// server-side instead of directly from the browser. The route handlers
// that use it still don't check who's asking (no auth yet — Phase 5).

import { createClient } from "@supabase/supabase-js";

// Same placeholder-fallback reasoning as lib/supabase.ts — see its comment.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "http://localhost:54321",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-service-role-key"
);
