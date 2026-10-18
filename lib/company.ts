// veramed — the one company this site belongs to.
//
// The database keeps the multi-tenant shape it was cloned from (a `brands`
// table, `brand_id` on everything) because it costs nothing and keeps every
// query explicit about whose data it touches — but there is exactly ONE row
// in `brands`, and it has this id. Nothing in the app looks a company up by
// slug or lets a visitor pick one.
//
// Must match supabase/seed.json's company.id.

export const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

/** False until .env.local has real Supabase keys. While false, the public
 *  pages render supabase/seed.json's sample content (lib/data.ts) so the
 *  site can be looked at before a database exists; the dashboard needs a
 *  real sign-in and stays unreachable. Same graceful-degradation idea as
 *  isCloudinaryConfigured(). */
export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
