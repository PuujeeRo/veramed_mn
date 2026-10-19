// /api/products/{productId}
//   PATCH  — product edits from ProductEditor, including publish/hide.
//   DELETE — removes a product (soft delete: status = 'deleted', so the
//            traffic rows that reference it stay attributable).
//
// Server-only write path (supabaseAdmin) after an ownership check. The
// product itself doesn't carry the caller's identity, so the check needs
// the product's brand_id first — one extra read before it can run.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sanitizeHtml } from "@/lib/sanitize";
import { canManageBrand, getSessionProfile } from "@/lib/auth";

// Rendered as hrefs on public pages — only http(s) may be stored. Empty
// string clears the field.
const httpUrl = z.string().refine((v) => v === "" || /^https?:\/\//i.test(v), "must be http(s)");

const bodySchema = z.object({
  name_mn: z.string().min(1).optional(),
  name_en: z.string().optional(),
  price: z.number().nonnegative().optional(),
  description_mn: z.string().optional(),
  description_en: z.string().optional(),
  imageUrl: z.string().min(1).optional(),
  galleryUrls: z.array(z.string()).optional(),
  buyNowUrl: httpUrl.optional(),
  videoUrl: httpUrl.optional(),
  social: z.object({ facebook: httpUrl.optional(), instagram: httpUrl.optional() }).optional(),
  contact: z.object({ phone: z.string().optional(), whatsapp: z.string().optional() }).optional(),
  /** The quizzes that may suggest this product — replaces its whole set. */
  quizIds: z.array(z.string().uuid()).optional(),
  categories: z.array(z.string()).optional(),
  pageTemplate: z.enum(["showcase", "classic", "gallery-first", "minimal"]).optional(),
  accent: z.enum(["crimson", "sunset", "sun", "sky", "sage"]).optional(),
  boostScore: z.number().min(0).max(100).optional(),
  // "deleted" is deliberately not accepted here — that's the DELETE handler.
  status: z.enum(["active", "inactive"]).optional(),
});

/** Returns the product's brand id when the caller may manage it, or the
 *  error response to send back. */
async function authorize(productId: string): Promise<{ brandId: string } | { denied: NextResponse }> {
  const { data: existing } = await supabaseAdmin
    .from("products")
    .select("brand_id, status")
    .eq("id", productId)
    .maybeSingle();
  if (!existing || existing.status === "deleted") {
    return { denied: NextResponse.json({ error: "not_found" }, { status: 404 }) };
  }
  const profile = await getSessionProfile();
  if (!canManageBrand(profile, existing.brand_id)) {
    return { denied: NextResponse.json({ error: "forbidden" }, { status: 403 }) };
  }
  return { brandId: existing.brand_id };
}

/** Puts the product in exactly these quizzes (of its own brand; other ids
 *  are dropped) and takes it out of the rest. */
async function setQuizMembership(productId: string, brandId: string, quizIds: string[]) {
  const { data: quizzes, error } = await supabaseAdmin.from("quizzes").select("id").eq("brand_id", brandId);
  if (error) return error;
  const own = new Set(quizzes.map((q) => q.id));
  const wanted = quizIds.filter((id) => own.has(id));

  const unlink = supabaseAdmin.from("quiz_products").delete().eq("product_id", productId);
  const { error: unlinkError } = await (wanted.length > 0 ? unlink.not("quiz_id", "in", `(${wanted.join(",")})`) : unlink);
  if (unlinkError) return unlinkError;

  if (wanted.length > 0) {
    const { error: linkError } = await supabaseAdmin
      .from("quiz_products")
      .upsert(
        wanted.map((quiz_id) => ({ quiz_id, product_id: productId })),
        { onConflict: "quiz_id,product_id", ignoreDuplicates: true }
      );
    if (linkError) return linkError;
  }
  return null;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { productId: string } }
) {
  const auth = await authorize(params.productId);
  if ("denied" in auth) return auth.denied;

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const patch = parsed.data;

  const update: Record<string, unknown> = {};
  if (patch.name_mn !== undefined) update.name_mn = patch.name_mn;
  if (patch.name_en !== undefined) update.name_en = patch.name_en || null;
  if (patch.price !== undefined) update.price = patch.price;
  if (patch.description_mn !== undefined) update.description_mn = sanitizeHtml(patch.description_mn);
  if (patch.description_en !== undefined) {
    update.description_en = patch.description_en ? sanitizeHtml(patch.description_en) : null;
  }
  if (patch.imageUrl !== undefined) update.image_url = patch.imageUrl;
  if (patch.galleryUrls !== undefined) update.gallery_urls = patch.galleryUrls.length ? patch.galleryUrls : null;
  if (patch.buyNowUrl !== undefined) update.buy_now_url = patch.buyNowUrl || null;
  if (patch.videoUrl !== undefined) update.video_url = patch.videoUrl || null;
  if (patch.social !== undefined) {
    const social: Record<string, string> = {};
    if (patch.social.facebook) social.facebook = patch.social.facebook;
    if (patch.social.instagram) social.instagram = patch.social.instagram;
    update.social = Object.keys(social).length ? social : null;
  }
  if (patch.contact !== undefined) {
    const contact: Record<string, string> = {};
    if (patch.contact.phone) contact.phone = patch.contact.phone;
    if (patch.contact.whatsapp) contact.whatsapp = patch.contact.whatsapp;
    update.contact = Object.keys(contact).length ? contact : null;
  }
  if (patch.categories !== undefined) update.categories = patch.categories;
  if (patch.pageTemplate !== undefined) update.page_template = patch.pageTemplate;
  if (patch.accent !== undefined) update.accent = patch.accent;
  if (patch.boostScore !== undefined) update.boost_score = patch.boostScore;
  if (patch.status !== undefined) update.status = patch.status;
  update.updated_at = new Date().toISOString();

  const { error } = await supabaseAdmin.from("products").update(update).eq("id", params.productId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (patch.quizIds !== undefined) {
    const membershipError = await setQuizMembership(params.productId, auth.brandId, patch.quizIds);
    if (membershipError) return NextResponse.json({ error: membershipError.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { productId: string } }
) {
  const auth = await authorize(params.productId);
  if ("denied" in auth) return auth.denied;

  const { error } = await supabaseAdmin
    .from("products")
    .update({ status: "deleted", updated_at: new Date().toISOString() })
    .eq("id", params.productId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
