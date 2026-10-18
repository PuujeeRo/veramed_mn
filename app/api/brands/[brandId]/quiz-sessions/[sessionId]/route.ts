// PATCH /api/brands/{brandId}/quiz-sessions/{sessionId} — marks a session
// completed and logs one `quiz_results` row per product actually shown
// ("reaching the result and getting a recommendation are the same
// moment"). No auth, same reasoning as the sibling POST route that creates
// the session. The update is scoped to (id, brand_id) together, so a
// sessionId that doesn't belong to this brand just matches nothing rather
// than completing someone else's session.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// .uuid() matters: these ids go into an `.in(...)` filter against a uuid
// column below, so a non-uuid string would surface as a Postgres cast
// error (500) instead of a clean 400 on an unauthenticated endpoint.
const bodySchema = z.object({ recommendedProductIds: z.array(z.string().uuid()).default([]) });

export async function PATCH(
  req: NextRequest,
  { params }: { params: { brandId: string; sessionId: string } }
) {
  const json = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data: session, error: updateError } = await supabaseAdmin
    .from("quiz_sessions")
    .update({ completed_at: new Date().toISOString() })
    .eq("id", params.sessionId)
    .eq("brand_id", params.brandId)
    .is("completed_at", null) // idempotent — a retried/duplicate call can't double-count
    .select("id")
    .maybeSingle();
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }
  if (!session) {
    // Already completed, or never existed for this brand — either way,
    // there's nothing left to do (and definitely nothing to log again).
    return NextResponse.json({ ok: true });
  }

  if (parsed.data.recommendedProductIds.length > 0) {
    // This route is unauthenticated by design (quiz takers are anonymous),
    // so the body is fully attacker-controlled: without this check, anyone
    // could POST another brand's product id here and it would be written
    // into THIS brand's quiz_results, stamped with this brand's brand_id.
    // The FK alone doesn't stop it — it only proves the product exists
    // somewhere. Verified before the fix: Brand B's product id landed in
    // Brand A's results with a 200. That breaks the single most important
    // rule in CLAUDE.md (one brand's data never surfaces under another's),
    // at the stats layer.
    const { data: ownProducts, error: ownError } = await supabaseAdmin
      .from("products")
      .select("id")
      .eq("brand_id", params.brandId)
      .in("id", parsed.data.recommendedProductIds);
    if (ownError) {
      return NextResponse.json({ error: ownError.message }, { status: 500 });
    }

    // Silently drop anything that isn't this brand's, rather than 4xx-ing:
    // a legitimate visitor can hit this with a product that was deleted
    // mid-quiz, and failing their session over it would cost a real
    // completion record to punish a request they didn't forge.
    const ownIds = new Set((ownProducts ?? []).map((p) => p.id));
    const valid = parsed.data.recommendedProductIds.filter((id) => ownIds.has(id));

    if (valid.length > 0) {
      const { error: resultsError } = await supabaseAdmin.from("quiz_results").insert(
        valid.map((productId) => ({
          brand_id: params.brandId,
          session_id: params.sessionId,
          recommended_product_id: productId,
        }))
      );
      if (resultsError) {
        return NextResponse.json({ error: resultsError.message }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ ok: true });
}
