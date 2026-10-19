"use client";

// veramed — traffic/funnel tracking (quiz_sessions, quiz_results,
// product_views, product_clicks). Recording writes go through service_role
// API routes with no auth requirement — quiz takers and catalog browsers
// are anonymous by design, so there's no session to check. Reading the
// numbers back DOES require being the manager, so that goes through the
// canManageBrand()-checked route (app/api/brands/[brandId]/stats) instead
// of a direct anon-client query — this isn't public data.
//
// Click-through rate and completion rate are computed by the reader
// (StatsPanel), never stored, so they can't drift out of sync with the two
// counts they're built from.
//
// Recording calls are fire-and-forget from every call site — failures are
// swallowed here rather than surfaced, since a dropped analytics beacon
// must never block or error out the page a visitor is looking at.

async function post(path: string, body?: unknown) {
  try {
    await fetch(path, {
      method: "POST",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    // Swallowed — see header comment.
  }
}

/** Product page loaded `product_views`. Brand is derived
 *  server-side from the product row, so this only needs the two ids that
 *  actually vary per call. */
export function recordProductView(productId: string, source: "web" | "qr") {
  void post(`/api/products/${productId}/view`, { source });
}

/** Buy Now link followed out to the brand's own store — `product_clicks`. */
export function recordBuyNowClick(productId: string) {
  void post(`/api/products/${productId}/click`);
}

/** Visitor opened the quiz — starts a `quiz_sessions` row and returns its
 *  id, needed later to mark the same row completed. Returns null on
 *  failure (network hiccup, etc.) — callers treat that as "nothing to
 *  complete later," never as a reason to block the quiz itself. */
export async function recordQuizSessionStart(brandId: string, quizId: string): Promise<string | null> {
  try {
    const res = await fetch(`/api/brands/${brandId}/quiz-sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quizId }),
    });
    if (!res.ok) return null;
    const { sessionId } = (await res.json()) as { sessionId: string };
    return sessionId;
  } catch {
    return null;
  }
}

/** Visitor reached the result screen — sets `quiz_sessions.completed_at`
 *  and logs one `quiz_results` row per product actually shown. No-ops if
 *  there's no session id (the start call above failed, or never fired). */
export function recordQuizComplete(
  brandId: string,
  sessionId: string | null,
  recommendedProductIds: string[]
) {
  if (!sessionId) return;
  void post(`/api/brands/${brandId}/quiz-sessions/${sessionId}`, { recommendedProductIds });
}

export interface ProductStats {
  views: number;
  webViews: number;
  qrViews: number;
  clicks: number;
  recommended: number;
}

export interface QuizFunnel {
  started: number;
  completed: number;
}

export interface BrandStatsResponse {
  funnel: QuizFunnel;
  products: Record<string, ProductStats>;
}

/** A brand's own numbers — canManageBrand()-checked server-side, so this
 *  must only ever be called for the signed-in manager's own brand (or by
 *  admin), same as every other dashboard read. */
export async function getBrandStats(brandId: string): Promise<BrandStatsResponse> {
  const res = await fetch(`/api/brands/${brandId}/stats`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
