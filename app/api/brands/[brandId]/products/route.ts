// POST /api/brands/{brandId}/products — creates a new product. Auth-checked
// the same way as every other write route (see lib/auth.ts). Collects only
// what a product needs to exist; everything else (gallery, video,
// categories, order link…) is filled in afterward through ProductEditor.
//
// A new product starts hidden ("inactive"): the create form asks for a name
// and one line of description, which is not a page anyone should land on
// yet. The manager publishes it from the editor once it's filled in.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sanitizeHtml } from "@/lib/sanitize";
import { canManageBrand, getSessionProfile } from "@/lib/auth";

const bodySchema = z.object({
  name_mn: z.string().min(1),
  description_mn: z.string().min(1),
  price: z.number().nonnegative(),
  imageUrl: z.string().min(1),
});

/** The create form's description is a plain textarea; the column holds
 *  HTML (every product page renders it as such), so escape and wrap it. */
function plainTextToHtml(text: string): string {
  const escaped = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return escaped
    .split(/\n{2,}/)
    .map((para) => `<p>${para.trim().replace(/\n/g, "<br>")}</p>`)
    .join("");
}

export async function POST(req: NextRequest, { params }: { params: { brandId: string } }) {
  const profile = await getSessionProfile();
  if (!canManageBrand(profile, params.brandId)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { name_mn, description_mn, price, imageUrl } = parsed.data;

  const { data, error } = await supabaseAdmin
    .from("products")
    .insert({
      brand_id: params.brandId,
      name_mn,
      description_mn: sanitizeHtml(plainTextToHtml(description_mn)),
      price,
      image_url: imageUrl,
      status: "inactive",
      include_in_quiz: true,
      categories: [],
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ product: data }, { status: 201 });
}
