// GET /api/brands/{brandId}/stats — a brand's own traffic/funnel numbers
// (plan §3 "Brand stats / traffic report"). canManageBrand()-checked, same
// as every other dashboard read/write — this is NOT public like
// brands/products, it's a brand's own business data (same treatment as
// slot_purchases).
//
// Counting is done in Postgres, NOT by fetching raw event rows and reducing
// them here. The earlier version did the latter and silently capped at
// 1000 (PostgREST's default row limit) — 1200 views reported as 1000, no
// error. See brand_stats() in supabase/schema.sql for the full
// reasoning; the funnel counts below use head-only exact counts for the
// same reason.

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { canManageBrand, getSessionProfile } from "@/lib/auth";

interface BrandStatsRow {
  product_id: string;
  views: number;
  web_views: number;
  qr_views: number;
  clicks: number;
  recommended: number;
}

export async function GET(_req: Request, { params }: { params: { brandId: string } }) {
  const profile = await getSessionProfile();
  if (!canManageBrand(profile, params.brandId)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const [sessionsTotal, sessionsCompleted, perProduct] = await Promise.all([
    supabaseAdmin
      .from("quiz_sessions")
      .select("id", { count: "exact", head: true })
      .eq("brand_id", params.brandId),
    supabaseAdmin
      .from("quiz_sessions")
      .select("id", { count: "exact", head: true })
      .eq("brand_id", params.brandId)
      .not("completed_at", "is", null),
    supabaseAdmin.rpc("brand_stats", { p_brand_id: params.brandId }),
  ]);

  if (perProduct.error) {
    return NextResponse.json({ error: perProduct.error.message }, { status: 500 });
  }

  const products: Record<
    string,
    { views: number; webViews: number; qrViews: number; clicks: number; recommended: number }
  > = {};
  for (const row of (perProduct.data ?? []) as BrandStatsRow[]) {
    products[row.product_id] = {
      views: Number(row.views),
      webViews: Number(row.web_views),
      qrViews: Number(row.qr_views),
      clicks: Number(row.clicks),
      recommended: Number(row.recommended),
    };
  }

  return NextResponse.json({
    funnel: { started: sessionsTotal.count ?? 0, completed: sessionsCompleted.count ?? 0 },
    products,
  });
}
