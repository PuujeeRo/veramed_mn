"use client";

// Shared block: product name. `page` is the product's own page, where the
// name is the page heading; without it this is a card title (quiz results).

import { localized, useLanguage } from "@/lib/i18n";
import { Product } from "@/lib/types";

export default function TitleBlock({ product, page, display }: { product: Product; page?: boolean; display?: boolean }) {
  const { locale } = useLanguage();
  const name = localized(locale, product.name_mn, product.name_en);
  // `display`: the big headline of a coloured hero (Showcase).
  if (display) {
    return (
      <h1 className="font-display text-[2.25rem] font-semibold leading-[1.02] tracking-[-0.03em] text-fg sm:text-5xl lg:text-[3.5rem]">
        {name}
      </h1>
    );
  }
  if (page) {
    return (
      <h1 className="font-display text-2xl font-semibold leading-tight tracking-tight text-fg sm:text-3xl">
        {name}
      </h1>
    );
  }
  return <h3 className="font-display text-xl font-semibold tracking-tight text-fg">{name}</h3>;
}
