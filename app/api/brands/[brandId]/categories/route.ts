// PUT /api/brands/[brandId]/categories — replaces the company's whole
// category list in one call (CategoriesPanel edits everything locally, then
// saves once). canManageBrand()-checked, same as every other write route.
//
// The old rows are deleted before the new ones go in (the unique
// (brand_id, slug) constraint rules out inserting first), and put back if
// the insert fails, so a failure never leaves the list empty. Client-sent
// ids are never trusted; real uuids are assigned on insert.
//
// Slugs are normalized with lib/slug.ts's slugify() rather than rejected —
// a manager typing a Mongolian name into the code field gets a usable ASCII
// code instead of a bare 400. Only reject a slug that is empty after
// normalizing, or one that appears twice in the submitted list.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getSessionProfile, canManageBrand } from "@/lib/auth";
import { slugify } from "@/lib/slug";

const bodySchema = z.object({
  categories: z.array(
    z.object({
      slug: z.string().min(1),
      name_mn: z.string().min(1),
      name_en: z.string().optional(),
    })
  ),
});

export async function PUT(req: NextRequest, { params }: { params: { brandId: string } }) {
  const profile = await getSessionProfile();
  if (!canManageBrand(profile, params.brandId)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const categories = parsed.data.categories.map((c) => ({ ...c, slug: slugify(c.slug) }));
  if (categories.some((c) => c.slug.length === 0)) {
    return NextResponse.json({ error: "invalid_slug" }, { status: 400 });
  }
  if (new Set(categories.map((c) => c.slug)).size !== categories.length) {
    return NextResponse.json({ error: "slug_taken" }, { status: 409 });
  }

  // The new rows can't be inserted while the old ones still hold the same
  // (brand_id, slug) pairs, so the old set is read first, the unique slugs
  // freed by deleting only AFTER the replacement set is known to be valid
  // — and restored if the insert fails.
  const { data: previous, error: readError } = await supabaseAdmin
    .from("categories")
    .select("slug, name_mn, name_en")
    .eq("brand_id", params.brandId);
  if (readError) {
    return NextResponse.json({ error: readError.message }, { status: 500 });
  }

  const { error: deleteError } = await supabaseAdmin.from("categories").delete().eq("brand_id", params.brandId);
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  let inserted: { id: string; slug: string; name_mn: string; name_en: string | null }[] = [];
  if (categories.length > 0) {
    const { data, error: insertError } = await supabaseAdmin
      .from("categories")
      .insert(
        categories.map((c) => ({
          slug: c.slug,
          name_mn: c.name_mn,
          name_en: c.name_en || null,
          brand_id: params.brandId,
        }))
      )
      .select();
    if (insertError) {
      if (previous && previous.length > 0) {
        await supabaseAdmin
          .from("categories")
          .insert(previous.map((c) => ({ ...c, brand_id: params.brandId })));
      }
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
    inserted = data ?? [];
  }

  return NextResponse.json({
    categories: inserted.map((r) => ({ id: r.id, slug: r.slug, name_mn: r.name_mn, name_en: r.name_en ?? "" })),
  });
}
