"use client";

// Shared block: description. HTML from the Lexical editor, sanitized
// server-side on every save (lib/sanitize.ts) before it reaches Postgres.
//
// `short` (Minimal template) clamps to 3 lines instead of dropping the
// content — a template picks the treatment, the block still owns how.

import { localized, useLanguage } from "@/lib/i18n";
import { Product } from "@/lib/types";

interface DescriptionBlockProps {
  product: Product;
  short?: boolean;
}

export default function DescriptionBlock({ product, short }: DescriptionBlockProps) {
  const { locale } = useLanguage();
  const description = localized(locale, product.description_mn, product.description_en);

  return (
    <div
      className={`prose prose-sm max-w-none text-fg-muted ${short ? "line-clamp-3" : ""}`}
      dangerouslySetInnerHTML={{ __html: description }}
    />
  );
}
