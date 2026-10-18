"use client";

// Fixed-layout product card for quiz results. Results are never templated:
// two recommendations sit side by side and must stay comparable regardless
// of each product's own page template.
//
// A product's own page (`/p/[productId]`) does NOT use this component — it
// goes through lib/templates.ts. Both compose the same blocks in
// components/product-blocks/, so there is exactly one implementation of
// gallery/price/order rendering — this file only decides the fixed order.

import { useLanguage } from "@/lib/i18n";
import { Product } from "@/lib/types";
import GalleryBlock from "./product-blocks/GalleryBlock";
import TitleBlock from "./product-blocks/TitleBlock";
import DescriptionBlock from "./product-blocks/DescriptionBlock";
import PriceBlock from "./product-blocks/PriceBlock";
import BuyNowBlock from "./product-blocks/BuyNowBlock";

interface ProductCardProps {
  product: Product;
  /** "Why this was recommended" — the matched category, in words. */
  reason?: string;
  /** Image beside the copy from `sm` up, instead of stacked above it. For
   *  a lone result that has the row to itself — never for two side by side. */
  horizontal?: boolean;
}

export default function ProductCard({ product, reason, horizontal }: ProductCardProps) {
  const { t } = useLanguage();

  return (
    <div
      className={`w-full overflow-hidden rounded-2xl border border-line bg-surface text-left shadow-sm ${
        horizontal ? "sm:grid sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]" : "max-w-md"
      }`}
    >
      <div className={`relative ${horizontal ? "sm:min-h-[18rem]" : ""}`}>
        <GalleryBlock product={product} single shape={horizontal ? "cover" : "banner"} />
      </div>

      <div className={horizontal ? "p-6 sm:p-8" : "p-6"}>
        {reason && (
          <p className="mb-2 text-sm text-fg-muted">
            {t("quiz.resultReason")} <span className="font-medium text-fg">{reason}</span>
          </p>
        )}
        <TitleBlock product={product} />
        <div className="mt-2">
          <DescriptionBlock product={product} />
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <PriceBlock product={product} />
          <BuyNowBlock product={product} />
        </div>
      </div>
    </div>
  );
}
