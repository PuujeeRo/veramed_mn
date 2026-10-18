"use client";

// One product in a grid — home, catalog, and "more products" under a
// product page all use this, so a product looks the same wherever a
// visitor meets it. The photo sits on the product's own colour tint
// (lib/accents.ts), the concept design's look.

import Image from "next/image";
import { FiArrowUpRight } from "react-icons/fi";
import { Link } from "@/lib/navigation";
import { localized, useLanguage } from "@/lib/i18n";
import { onImageError } from "@/lib/media";
import { accentClass } from "@/lib/accents";
import { Product } from "@/lib/types";

export default function ProductTile({ product, label }: { product: Product; label?: string }) {
  const { locale } = useLanguage();
  const name = localized(locale, product.name_mn, product.name_en);
  return (
    <Link
      href={`/p/${product.id}`}
      className="group flex flex-col overflow-hidden rounded-[1.5rem] border border-line bg-surface transition duration-300 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-pop"
    >
      <span className={`${accentClass(product.accent)} accent-tile relative flex aspect-[4/5] items-center justify-center overflow-hidden`}>
        <Image
          src={product.imageUrl}
          alt={name}
          width={360}
          height={450}
          unoptimized
          onError={onImageError}
          className="h-full w-full object-contain p-5 transition-transform duration-500 group-hover:scale-[1.04] sm:p-7"
        />
        {label && (
          <span className="absolute left-3 top-3 rounded-full bg-surface/85 px-2.5 py-1 text-xs font-medium text-fg backdrop-blur">
            {label}
          </span>
        )}
      </span>
      <span className="flex flex-1 items-end justify-between gap-3 p-4">
        <span className="min-w-0">
          <span className="line-clamp-2 font-display text-[0.9375rem] font-semibold leading-snug tracking-tight text-fg">{name}</span>
          <span className="mt-1 block text-sm font-semibold tabular-nums text-fg-muted">₮{product.price.toLocaleString("en-US")}</span>
        </span>
        <span
          aria-hidden="true"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-subtle text-fg transition group-hover:bg-brand-600 group-hover:text-white"
        >
          <FiArrowUpRight size={16} />
        </span>
      </span>
    </Link>
  );
}
