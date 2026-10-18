"use client";

// Gallery-first: Gallery · Video · Title · Price+BuyNow ·
// Description · Social. Leads with the product photos, for brands whose
// imagery sells harder than their copy.
//
// This file only decides ordering — see CLAUDE.md #10. From `lg` up the
// media takes the wider column and the copy stays in view beside it.

import { Product } from "@/lib/types";
import GalleryBlock from "@/components/product-blocks/GalleryBlock";
import VideoBlock from "@/components/product-blocks/VideoBlock";
import TitleBlock from "@/components/product-blocks/TitleBlock";
import PurchaseBlock from "@/components/product-blocks/PurchaseBlock";
import DescriptionBlock from "@/components/product-blocks/DescriptionBlock";
import SocialBlock from "@/components/product-blocks/SocialBlock";

export default function GalleryFirstTemplate({ product }: { product: Product }) {
  return (
    <article className="flex w-full flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start lg:gap-x-12">
      <div className="flex flex-col gap-5">
        <GalleryBlock product={product} shape="square" />
        <VideoBlock product={product} />
      </div>
      {/* top-24, not top-8: the site header above is itself sticky. */}
      <div className="flex flex-col gap-5 lg:sticky lg:top-24">
        <TitleBlock product={product} page />
        <PurchaseBlock product={product} />
        <DescriptionBlock product={product} />
        <SocialBlock product={product} />
      </div>
    </article>
  );
}
