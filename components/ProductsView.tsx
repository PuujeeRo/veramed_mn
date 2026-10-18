"use client";

// Client half of /products — the full catalog, filterable by category.
// The filter is local (no round trip) and kept in the URL (`?category=`)
// so the home page's chips link straight into a filtered view and a
// filtered view can be shared.

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { FiArrowRight, FiGrid, FiHelpCircle } from "react-icons/fi";
import { Link, usePathname, useRouter } from "@/lib/navigation";
import { localized, useLanguage } from "@/lib/i18n";
import { categoryIcon } from "@/lib/categoryIcons";
import { Category, Product } from "@/lib/types";
import ProductTile from "@/components/ProductTile";

interface ProductsViewProps {
  products: Product[];
  categories: Category[];
  hasQuiz: boolean;
}

export default function ProductsView({ products, categories, hasQuiz }: ProductsViewProps) {
  const { locale, t } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Only categories that actually have a product — an empty filter is a
  // dead end.
  const usedCategories = useMemo(
    () => categories.filter((c) => products.some((p) => p.categories.includes(c.slug))),
    [categories, products]
  );
  const requested = searchParams.get("category");
  const active = usedCategories.some((c) => c.slug === requested) ? requested : null;
  const shown = active ? products.filter((p) => p.categories.includes(active)) : products;

  function choose(slug: string | null) {
    router.replace(slug ? `${pathname}?category=${encodeURIComponent(slug)}` : pathname, { scroll: false });
  }

  const chip = (on: boolean) =>
    `group inline-flex h-10 items-center gap-2 rounded-full border pl-1.5 pr-4 text-sm font-medium transition active:scale-[0.98] ${
      on ? "border-fg bg-fg text-page" : "border-line bg-surface text-fg hover:border-line-strong"
    }`;
  const chipIcon = (on: boolean) =>
    `flex h-7 w-7 items-center justify-center rounded-full transition ${on ? "bg-page/15 text-page" : "bg-subtle text-fg-muted group-hover:text-fg"}`;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-fg sm:text-5xl">{t("brand.products")}</h1>
          <p className="mt-2 text-fg-muted">{t("products.count", { n: products.length })}</p>
        </div>
      </div>

      {usedCategories.length > 1 && (
        <div role="group" aria-label={t("dashCat.title")} className="mt-8 flex flex-wrap gap-2">
          <button type="button" onClick={() => choose(null)} aria-pressed={active === null} className={chip(active === null)}>
            <span className={chipIcon(active === null)}>
              <FiGrid size={14} />
            </span>
            {t("dash.filterAll")}
          </button>
          {usedCategories.map((c) => {
            const on = active === c.slug;
            const Icon = categoryIcon(c.slug);
            return (
              <button key={c.slug} type="button" onClick={() => choose(c.slug)} aria-pressed={on} className={chip(on)}>
                <span className={chipIcon(on)}>
                  <Icon size={14} />
                </span>
                {localized(locale, c.name_mn, c.name_en)}
              </button>
            );
          })}
        </div>
      )}

      {shown.length === 0 ? (
        <p className="mt-10 text-fg-muted">{t("brand.noProducts")}</p>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-4 min-[360px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 lg:gap-5">
          {shown.map((p) => (
            <ProductTile key={p.id} product={p} />
          ))}
        </div>
      )}

      {hasQuiz && (
        <Link
          href="/quiz"
          className="accent-crimson accent-hero group mt-14 flex flex-col items-start gap-5 overflow-hidden rounded-[1.75rem] p-6 sm:flex-row sm:items-center sm:p-9"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white ring-1 ring-inset ring-white/25">
            <FiHelpCircle size={22} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-xl font-semibold tracking-tight text-white sm:text-2xl">{t("brand.quizCardTitle")}</span>
            <span className="mt-1 block text-white/80">{t("products.quizBody")}</span>
          </span>
          <span className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-[rgb(var(--brand-grad-4))] px-6 font-semibold text-[rgb(41_20_8)] transition group-hover:brightness-95">
            {t("landing.viewQuiz")}
            <FiArrowRight className="transition-transform group-hover:translate-x-0.5" />
          </span>
        </Link>
      )}
    </div>
  );
}
