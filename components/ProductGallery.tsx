"use client";

// image gallery — up to 6 images. Main image with
// previous/next buttons and a position counter, plus thumbnails; Simple
// tier never reaches this component.

import { useState } from "react";
import Image from "next/image";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { onImageError } from "@/lib/media";
import { useLanguage } from "@/lib/i18n";

interface ProductGalleryProps {
  images: string[];
  alt: string;
  /** Standalone on the page (rounded, no card around it) rather than flush
   *  against a card's edges. */
  framed?: boolean;
}

const ARROW =
  "absolute top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition hover:bg-black/65 active:scale-95";

export default function ProductGallery({ images, alt, framed }: ProductGalleryProps) {
  const { t } = useLanguage();
  const [active, setActive] = useState(0);
  const current = images[active] ?? images[0];
  const many = images.length > 1;
  const step = (by: number) => setActive((i) => (i + by + images.length) % images.length);

  return (
    <div>
      <div className={`relative overflow-hidden ${framed ? "rounded-2xl border border-line" : ""}`}>
        <Image
          src={current}
          alt={alt}
          width={500}
          height={500}
          unoptimized
          onError={onImageError}
          className={
            framed ? "aspect-[4/3] w-full object-cover sm:aspect-square" : "h-64 w-full object-cover"
          }
        />
        {many && (
          <>
            <button onClick={() => step(-1)} aria-label={t("gallery.prev")} className={`${ARROW} left-2.5`}>
              <FiChevronLeft size={18} />
            </button>
            <button onClick={() => step(1)} aria-label={t("gallery.next")} className={`${ARROW} right-2.5`}>
              <FiChevronRight size={18} />
            </button>
            <span className="absolute bottom-2.5 right-2.5 rounded-full bg-black/45 px-2.5 py-1 text-xs font-medium tabular-nums text-white backdrop-blur-sm">
              {active + 1} / {images.length}
            </span>
          </>
        )}
      </div>
      {many && (
        <div className={`flex gap-2 overflow-x-auto ${framed ? "mt-3" : "p-3"}`}>
          {images.map((src, i) => (
            <button
              key={src}
              onClick={() => setActive(i)}
              aria-pressed={i === active}
              className={`shrink-0 overflow-hidden rounded-xl border-2 transition active:scale-95 ${
                i === active ? "border-brand-600" : "border-transparent opacity-60 hover:opacity-100"
              }`}
              aria-label={`${alt} — ${i + 1}`}
            >
              <Image
                src={src}
                alt=""
                width={64}
                height={64}
                unoptimized
                onError={onImageError}
                className="h-14 w-14 object-cover sm:h-16 sm:w-16"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
