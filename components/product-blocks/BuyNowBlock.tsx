"use client";

// Shared block: Buy Now deep-link to the brand's own store. Renders nothing
// when the product has no buyNowUrl — the platform never handles checkout
// itself.
//
// `wide` (a product's own page) is a larger button that takes the full row
// on a phone; without it this is the compact button a quiz-result card uses.

import { FiExternalLink } from "react-icons/fi";
import { useLanguage } from "@/lib/i18n";
import { Product } from "@/lib/types";
import { recordBuyNowClick } from "@/lib/stats";

export default function BuyNowBlock({
  product,
  wide,
  onAccent,
}: {
  product: Product;
  wide?: boolean;
  /** On a product's coloured hero: the accent's own button colours
   *  (--accent-cta, globals.css) instead of brand red, and a pill. */
  onAccent?: boolean;
}) {
  const { t } = useLanguage();
  if (!product.buyNowUrl) return null;

  return (
    <a
      href={product.buyNowUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => recordBuyNowClick(product.id)}
      className={`inline-flex items-center justify-center gap-2 rounded-full text-sm font-semibold transition active:scale-[0.98] ${
        onAccent
          ? "bg-[rgb(var(--accent-cta))] text-[rgb(var(--accent-cta-ink))] shadow-[0_8px_24px_-8px_rgb(0_0_0/0.35)] hover:brightness-95"
          : "bg-brand-600 text-white hover:bg-brand-700"
      } ${wide ? "h-12 w-full px-8 min-[420px]:w-auto" : "h-10 px-6"}`}
    >
      {t("product.buyNow")} <FiExternalLink size={14} className="shrink-0" />
    </a>
  );
}
