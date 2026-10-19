"use client";

// Client half of /p/{productId} — the Server Component in
// app/[locale]/(site)/p/[productId]/page.tsx does the fetch and the
// notFound() guard; this renders the resolved product and handles what's
// genuinely client-side: the chosen template, sharing, and view tracking.
//
// The product itself is drawn by a template. Everything else here is the
// page around it — a way back above, and below it the quiz and the other
// products, so the page never dead-ends.

import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Link } from "@/lib/navigation";
import { FiArrowLeft, FiArrowRight, FiCheck, FiHelpCircle, FiShare2 } from "react-icons/fi";
import { recordProductView } from "@/lib/stats";
import { Product } from "@/lib/types";
import { resolveTemplate, getTemplateComponent } from "@/lib/templates";
import ProductTile from "@/components/ProductTile";
import { localized, useLanguage } from "@/lib/i18n";

interface ProductPageViewProps {
  product: Product;
  /** The other products, for "more products". */
  others?: Product[];
  /** A published quiz that can recommend this product, or null for none. */
  quizHref: string | null;
}

// How many other products to show before "see all".
const MORE_LIMIT = 4;

export default function ProductPageView({ product, others = [], quizHref }: ProductPageViewProps) {
  const { locale, t } = useLanguage();

  // View tracking — `?src=qr` (the QR generator's own link format) marks a
  // scan; anything else counts as an ordinary web visit. Ref-guarded:
  // React Strict Mode double-invokes effects in dev, which would otherwise
  // double-count every local visit.
  const searchParams = useSearchParams();
  const viewLogged = useRef(false);
  useEffect(() => {
    if (viewLogged.current) return;
    viewLogged.current = true;
    recordProductView(product.id, searchParams.get("src") === "qr" ? "qr" : "web");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id]);

  // Share — the phone's own share sheet where there is one, otherwise copy
  // the link. Query string dropped on purpose: forwarding `?src=qr` would
  // count every friend's visit as a QR scan.
  const [copied, setCopied] = useState(false);
  const name = localized(locale, product.name_mn, product.name_en);
  async function handleShare() {
    const url = window.location.origin + window.location.pathname;
    try {
      if (navigator.share) {
        await navigator.share({ title: name, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Share sheet dismissed, or clipboard blocked — nothing to report.
    }
  }

  const TemplateComponent = getTemplateComponent(resolveTemplate(product));

  const inQuiz = quizHref !== null;
  const more = others.slice(0, MORE_LIMIT);

  return (
    // Wide enough for a template's two-column split on a desktop; each
    // template caps its own reading width inside.
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <Link
          href="/products"
          className="inline-flex min-h-9 items-center gap-1.5 text-sm text-fg-muted transition hover:text-fg"
        >
          <FiArrowLeft size={14} className="shrink-0" />
          {t("product.allProducts")}
        </Link>
        <button
          onClick={handleShare}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-line px-3.5 text-sm text-fg-muted transition hover:border-brand-500 hover:text-fg active:scale-[0.98]"
        >
          {copied ? <FiCheck size={14} className="shrink-0 text-brand-600" /> : <FiShare2 size={14} className="shrink-0" />}
          <span aria-live="polite">{copied ? t("product.linkCopied") : t("product.share")}</span>
        </button>
      </div>

      <TemplateComponent product={product} />

      {/* Where to go next. The quiz only when this product is actually in
          it; the other products whenever there are any. */}
      {quizHref && (
        <Link
          href={quizHref}
          className="group mt-12 flex items-center gap-4 rounded-2xl border border-line bg-surface p-4 transition hover:border-brand-500 sm:p-5"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white">
            <FiHelpCircle size={20} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-medium text-fg">{t("brand.quizCardTitle")}</span>
            <span className="mt-0.5 block text-sm text-brand-600">{t("landing.viewQuiz")}</span>
          </span>
          <FiArrowRight className="shrink-0 text-brand-600 transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}

      {more.length > 0 && (
        <section className={`border-t border-line pt-8 ${inQuiz ? "mt-8" : "mt-12"}`}>
          <div className="mb-5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 className="text-lg font-semibold tracking-tight text-fg">{t("product.more")}</h2>
            {others.length > more.length && (
              <Link
                href="/products"
                className="group inline-flex items-center gap-1 text-sm font-medium text-brand-600 transition hover:text-brand-700"
              >
                {t("product.seeAll", { count: others.length + 1 })}
                <FiArrowRight size={14} className="shrink-0 transition-transform group-hover:translate-x-0.5" />
              </Link>
            )}
          </div>
          <div className="grid grid-cols-1 gap-4 min-[340px]:grid-cols-2 lg:grid-cols-4">
            {more.map((p) => (
              <ProductTile key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
