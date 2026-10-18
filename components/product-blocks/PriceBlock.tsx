"use client";

// Shared block: price. Templates place it beside BuyNowBlock, but each
// owns its own markup — see CLAUDE.md #10.

import { Product } from "@/lib/types";

export default function PriceBlock({ product, large, display }: { product: Product; large?: boolean; display?: boolean }) {
  return (
    <span
      className={`font-display font-semibold tabular-nums tracking-tight text-brand-700 ${
        display ? "text-4xl leading-none sm:text-5xl" : large ? "text-[1.75rem] leading-none sm:text-3xl" : "text-lg"
      }`}
    >
      ₮{product.price.toLocaleString("en-US")}
    </span>
  );
}
