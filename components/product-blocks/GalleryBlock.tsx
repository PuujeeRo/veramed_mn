"use client";

// Shared block: product image(s). A product with `galleryUrls` renders the
// full thumbnail gallery; `single` (Minimal template, quiz results) shows
// only the first image — same data, fewer pixels.
//
// This is the one implementation of gallery rendering. A template only
// decides where this block sits and which `shape`/`single` is passed — it
// must never re-draw the image grid itself (plan §6).

import Image from "next/image";
import { localized, useLanguage } from "@/lib/i18n";
import { onImageError } from "@/lib/media";
import { Product } from "@/lib/types";
import ProductGallery from "@/components/ProductGallery";

// banner — fixed-height strip across the top of a card (quiz results).
// square — a standalone rounded image, for templates that sit directly on
//          the page rather than inside a card.
// cover  — fills its `relative` parent from `sm` up (the horizontal
//          ProductCard's image column); a plain banner below that.
// float  — the product alone, no frame, with a soft drop shadow: for
//          sitting on a coloured hero (Showcase).
type GalleryShape = "banner" | "square" | "cover" | "float";

const SHAPE_CLASS: Record<GalleryShape, string> = {
  banner: "h-64 w-full object-cover",
  square: "aspect-[4/3] w-full rounded-2xl border border-line object-cover sm:aspect-square",
  cover: "h-56 w-full object-cover sm:absolute sm:inset-0 sm:h-full",
  float:
    "mx-auto h-auto max-h-[22rem] w-full max-w-[22rem] object-contain drop-shadow-[0_28px_32px_rgb(0_0_0/0.28)] sm:max-h-[26rem] sm:max-w-[26rem]",
};

interface GalleryBlockProps {
  product: Product;
  /** Minimal template: one image, no thumbnail strip. */
  single?: boolean;
  shape?: GalleryShape;
}

export default function GalleryBlock({ product, single, shape = "banner" }: GalleryBlockProps) {
  const { locale } = useLanguage();
  const name = localized(locale, product.name_mn, product.name_en);
  const images = product.galleryUrls?.length ? product.galleryUrls : [product.imageUrl];

  if (single || images.length === 1) {
    return (
      <Image
        src={images[0]}
        alt={name}
        width={500}
        height={500}
        unoptimized
        onError={onImageError}
        className={SHAPE_CLASS[shape]}
      />
    );
  }

  return <ProductGallery images={images} alt={name} framed={shape === "square"} />;
}
