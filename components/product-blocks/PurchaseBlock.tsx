"use client";

// Shared block: the price and the Buy Now button as one unit, for a
// product's own page. It composes PriceBlock and BuyNowBlock rather than
// redrawing either, and adds the one line a visitor needs before tapping:
// the purchase happens on the brand's own store, not here (plan §1 — the
// platform never handles checkout).
//
// `bare` drops the panel chrome, for use inside something that is already a
// card (the Simple tier's ProductCard).

import { useLanguage } from "@/lib/i18n";
import { Product } from "@/lib/types";
import PriceBlock from "./PriceBlock";
import BuyNowBlock from "./BuyNowBlock";

export default function PurchaseBlock({ product, bare }: { product: Product; bare?: boolean }) {
  const { t } = useLanguage();
  return (
    <div className={bare ? "border-t border-line pt-5" : "rounded-2xl border border-line bg-surface p-4 sm:p-5"}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <PriceBlock product={product} large />
        <BuyNowBlock product={product} wide />
      </div>
      {product.buyNowUrl && (
        <p className="mt-3 text-xs leading-relaxed text-fg-faint">{t("product.buyNote")}</p>
      )}
    </div>
  );
}
