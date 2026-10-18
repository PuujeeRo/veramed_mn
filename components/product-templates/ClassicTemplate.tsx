"use client";

// Classic: Title · Gallery · Description · Price+Order · Video · Social.
// The default template.
//
// This file only decides ordering — every block owns its own dark mode,
// translations, and narrow-screen behaviour. Never redraw a block's
// internals here.
//
// Below `lg` it is one column in exactly the order above. From `lg` up it
// splits in two — media left, copy right. The two column wrappers are
// `display: contents` until then, so the `order-*` classes interleave their
// children into the single mobile column; `empty:hidden` drops the wrapper
// of a block that rendered nothing (no video, no social links).

import { Product } from "@/lib/types";
import TitleBlock from "@/components/product-blocks/TitleBlock";
import GalleryBlock from "@/components/product-blocks/GalleryBlock";
import DescriptionBlock from "@/components/product-blocks/DescriptionBlock";
import PurchaseBlock from "@/components/product-blocks/PurchaseBlock";
import VideoBlock from "@/components/product-blocks/VideoBlock";
import SocialBlock from "@/components/product-blocks/SocialBlock";

export default function ClassicTemplate({ product }: { product: Product }) {
  return (
    <article className="flex w-full flex-col gap-5 lg:grid lg:grid-cols-2 lg:items-start lg:gap-x-12">
      {/* top-24, not top-8: the site header above is itself sticky. */}
      <div className="contents lg:sticky lg:top-24 lg:flex lg:flex-col lg:gap-5">
        <div className="order-2 lg:order-none">
          <GalleryBlock product={product} shape="square" />
        </div>
        <div className="order-5 empty:hidden lg:order-none">
          <VideoBlock product={product} />
        </div>
      </div>
      <div className="contents lg:flex lg:flex-col lg:gap-5">
        <div className="order-1 lg:order-none">
          <TitleBlock product={product} page />
        </div>
        <div className="order-3 lg:order-none">
          <DescriptionBlock product={product} />
        </div>
        <div className="order-4 lg:order-none">
          <PurchaseBlock product={product} />
        </div>
        <div className="order-6 empty:hidden lg:order-none">
          <SocialBlock product={product} />
        </div>
      </div>
    </article>
  );
}
