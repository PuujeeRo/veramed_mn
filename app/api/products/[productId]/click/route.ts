// POST /api/products/{productId}/click — logs one `product_clicks` row
// (Buy Now followed out to the brand's own store). No auth, same
// reasoning as the view route this mirrors. source stays 'web' always —
// see supabase/schema.sql's comment on product_clicks.source for why
// (Buy Now's onClick has no reliable access to `?src=qr`).

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(_req: NextRequest, { params }: { params: { productId: string } }) {
  const { data: product } = await supabaseAdmin
    .from("products")
    .select("brand_id")
    .eq("id", params.productId)
    .maybeSingle();
  if (!product) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { error } = await supabaseAdmin.from("product_clicks").insert({
    product_id: params.productId,
    brand_id: product.brand_id,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}
