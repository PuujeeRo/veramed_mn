"use client";

// Minimal: Title · Price+BuyNow · single image · short
// Description. No video, no social row — for brands who want the page to
// get out of the way. Deliberately the sparsest of the three: one narrow
// column at every width, never the two-column split the other two use.
//
// This file only decides ordering — see CLAUDE.md #10.

import { Product } from "@/lib/types";
import TitleBlock from "@/components/product-blocks/TitleBlock";
import PurchaseBlock from "@/components/product-blocks/PurchaseBlock";
import GalleryBlock from "@/components/product-blocks/GalleryBlock";
import DescriptionBlock from "@/components/product-blocks/DescriptionBlock";

export default function MinimalTemplate({ product }: { product: Product }) {
  return (
    <article className="mx-auto flex w-full max-w-xl flex-col gap-4">
      <TitleBlock product={product} page />
      <PurchaseBlock product={product} />
      <GalleryBlock product={product} single shape="square" />
      <DescriptionBlock product={product} short />
    </article>
  );
}
