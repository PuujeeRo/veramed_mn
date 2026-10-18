"use client";

// Showcase: the product on a full colour block in its own theme colour
// (lib/accents.ts), the design concept's look. The default layout.
//
//   lg+:  [ Title · short description ]  [ product ]  [ price · Order ]
//         inside one rounded colour block, leaves drifting behind.
//   <lg:  the colour block holds the product alone; a white sheet overlaps
//         its bottom edge with title, price and Order (the concept's
//         mobile card).
// Below the block: full description, gallery (when there's more than one
// image), video, contact — the same shared blocks every template uses.
//
// This file only decides ordering and the colour block. Blocks placed on
// the colour sit inside `.on-accent`, which re-points the theme tokens
// (globals.css) so each block renders in the accent's ink by itself.

import { Product } from "@/lib/types";
import { accentClass } from "@/lib/accents";
import TitleBlock from "@/components/product-blocks/TitleBlock";
import GalleryBlock from "@/components/product-blocks/GalleryBlock";
import DescriptionBlock from "@/components/product-blocks/DescriptionBlock";
import PriceBlock from "@/components/product-blocks/PriceBlock";
import BuyNowBlock from "@/components/product-blocks/BuyNowBlock";
import VideoBlock from "@/components/product-blocks/VideoBlock";
import SocialBlock from "@/components/product-blocks/SocialBlock";
import PurchaseBlock from "@/components/product-blocks/PurchaseBlock";

/** Soft leaf shapes behind the product — the leaf from the company logo. */
function Leaves() {
  const leaf = "M50 4C22 22 10 52 18 96c40-6 66-38 32-92z";
  return (
    <svg aria-hidden="true" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" className="pointer-events-none absolute inset-0 h-full w-full text-black/[0.07]">
      <g fill="currentColor">
        <path d={leaf} transform="translate(250 10) rotate(28 50 50) scale(1.5)" />
        <path d={leaf} transform="translate(60 150) rotate(-38 50 50) scale(1.25)" />
        <path d={leaf} transform="translate(310 185) rotate(118 50 50) scale(0.9)" />
      </g>
    </svg>
  );
}

export default function ShowcaseTemplate({ product }: { product: Product }) {
  const hasGallery = (product.galleryUrls?.length ?? 0) > 1;

  return (
    <article className="flex w-full flex-col">
      <div className={`${accentClass(product.accent)} accent-hero relative overflow-hidden rounded-[1.75rem] sm:rounded-[2rem]`}>
        <Leaves />
        <div className="on-accent relative grid items-center gap-6 px-5 pb-16 pt-8 sm:px-10 sm:pb-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,0.8fr)] lg:gap-8 lg:px-12 lg:py-14">
          <div className="hidden min-w-0 flex-col gap-5 lg:flex">
            <TitleBlock product={product} display />
            <div className="max-w-[34ch] opacity-90">
              <DescriptionBlock product={product} short />
            </div>
          </div>

          <div className="motion-safe:animate-fade-up">
            <GalleryBlock product={product} single shape="float" />
          </div>

          <div className="hidden flex-col items-start gap-5 lg:flex lg:items-end">
            <PriceBlock product={product} display />
            <BuyNowBlock product={product} wide onAccent />
          </div>
        </div>
      </div>

      {/* Below lg: the overlapping sheet. */}
      <div className="relative z-[1] mx-2 -mt-10 rounded-[1.5rem] border border-line bg-surface p-5 shadow-pop sm:mx-6 sm:p-7 lg:hidden">
        <TitleBlock product={product} display />
        <div className="mt-5">
          <PurchaseBlock product={product} bare />
        </div>
      </div>

      <div className="mt-10 grid gap-10 lg:mt-14 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:gap-14">
        <div className="flex min-w-0 flex-col gap-8">
          <div className="max-w-[68ch]">
            <DescriptionBlock product={product} />
          </div>
          <div className="empty:hidden">
            <VideoBlock product={product} />
          </div>
        </div>
        <div className="flex min-w-0 flex-col gap-8">
          {hasGallery && <GalleryBlock product={product} shape="square" />}
          <div className="empty:hidden">
            <SocialBlock product={product} />
          </div>
        </div>
      </div>
    </article>
  );
}
