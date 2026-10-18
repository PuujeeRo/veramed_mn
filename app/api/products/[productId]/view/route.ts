// POST /api/products/{productId}/view — logs one `product_views` row
//. No auth: a catalog browser is anonymous by design,
// so there's nothing to check ownership against. brand_id is derived from
// the product row rather than trusted from the client, so a spoofed body
// can't attribute a view to the wrong brand.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const bodySchema = z.object({ source: z.enum(["web", "qr"]).default("web") });

export async function POST(req: NextRequest, { params }: { params: { productId: string } }) {
  const json = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data: product } = await supabaseAdmin
    .from("products")
    .select("brand_id")
    .eq("id", params.productId)
    .maybeSingle();
  if (!product) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { error } = await supabaseAdmin.from("product_views").insert({
    product_id: params.productId,
    brand_id: product.brand_id,
    source: parsed.data.source,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}
