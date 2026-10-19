"use client";

// The Stats section — reads real numbers through
// app/api/brands/[brandId]/stats (owner-checked). Rates (completion,
// click-through) are computed here from the counts, never stored, so they
// can't drift from the numbers they're built from.
//
// Headline tiles, a quiz funnel bar, then one row per product with an
// inline bar for views, so products compare down a column at a glance.

import { useEffect, useState } from "react";
import Image from "next/image";
import { FiBarChart2, FiRefreshCw } from "react-icons/fi";
import { Brand, Product, Quiz } from "@/lib/types";
import { getBrandStats, ProductStats, QuizFunnel } from "@/lib/stats";
import { localized, useLanguage } from "@/lib/i18n";
import { onImageError } from "@/lib/media";
import PageHeader from "./ui/PageHeader";
import Section from "./ui/Section";
import EmptyState from "./ui/EmptyState";

interface StatsPanelProps {
  brand: Brand;
  products: Product[];
  /** Which products a quiz can recommend at all — "—" instead of 0 for the rest. */
  quizzes: Quiz[];
}

const emptyStats: ProductStats = { views: 0, webViews: 0, qrViews: 0, clicks: 0, recommended: 0 };
const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

export default function StatsPanel({ brand, products, quizzes }: StatsPanelProps) {
  const inAnyQuiz = new Set(quizzes.flatMap((q) => q.productIds));
  const { locale, t } = useLanguage();
  const [funnel, setFunnel] = useState<QuizFunnel>({ started: 0, completed: 0 });
  const [productStats, setProductStats] = useState<Record<string, ProductStats>>({});
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setState("loading");
    getBrandStats(brand.id)
      .then((res) => {
        setFunnel(res.funnel);
        setProductStats(res.products);
        setState("ready");
      })
      .catch(() => setState("error"));
  }, [brand.id, attempt]);

  const header = <PageHeader title={t("dash.tabStats")} description={t("dash.descStats")} />;

  if (state === "error") {
    return (
      <>
        {header}
        <div className="card">
          <EmptyState
            icon={FiBarChart2}
            title={t("stats.loadErrorTitle")}
            body={t("stats.loadError")}
            action={
              <button type="button" onClick={() => setAttempt((n) => n + 1)} className="btn-secondary">
                <FiRefreshCw size={15} /> {t("common.retry")}
              </button>
            }
          />
        </div>
      </>
    );
  }

  if (state === "loading") {
    return (
      <>
        {header}
        <div className="flex flex-col gap-6" aria-busy="true" aria-label={t("common.loading")}>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="card p-5">
                <div className="h-3 w-24 animate-pulse rounded bg-subtle" />
                <div className="mt-3 h-8 w-16 animate-pulse rounded bg-subtle" />
              </div>
            ))}
          </div>
          <div className="card h-64 animate-pulse" />
        </div>
      </>
    );
  }

  const rows = products
    .map((p) => ({ product: p, stats: productStats[p.id] ?? emptyStats }))
    .sort((a, b) => b.stats.views - a.stats.views);
  const totalViews = rows.reduce((sum, r) => sum + r.stats.views, 0);
  const totalQr = rows.reduce((sum, r) => sum + r.stats.qrViews, 0);
  const totalClicks = rows.reduce((sum, r) => sum + r.stats.clicks, 0);
  const maxViews = Math.max(1, ...rows.map((r) => r.stats.views));

  const tiles = [
    { label: t("stats.started"), value: funnel.started, sub: t("stats.quizFunnel") },
    { label: t("stats.completed"), value: funnel.completed, sub: t("stats.rateSub", { rate: pct(funnel.completed, funnel.started) }) },
    { label: t("stats.views"), value: totalViews, sub: t("stats.qrSub", { count: totalQr }) },
    { label: t("stats.clicks"), value: totalClicks, sub: t("stats.ctrSub", { rate: pct(totalClicks, totalViews) }) },
  ];

  return (
    <>
      {header}
      <div className="flex flex-col gap-6">
        <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {tiles.map((tile) => (
            <div key={tile.label} className="card p-4 sm:p-5">
              <dt className="text-sm font-medium text-fg-muted">{tile.label}</dt>
              <dd className="mt-2 font-display text-3xl font-semibold tabular-nums tracking-tight text-fg">{tile.value.toLocaleString("en-US")}</dd>
              <dd className="mt-1 text-xs text-fg-faint">{tile.sub}</dd>
            </div>
          ))}
        </dl>

        <Section title={t("stats.funnelTitle")} description={t("stats.funnelBody")}>
          <div className="flex flex-col gap-3">
            {[
              { label: t("stats.started"), value: funnel.started, width: 100 },
              { label: t("stats.completed"), value: funnel.completed, width: pct(funnel.completed, funnel.started) },
            ].map((bar) => (
              <div key={bar.label} className="grid grid-cols-[8rem_minmax(0,1fr)_3.5rem] items-center gap-3 text-sm">
                <span className="truncate text-fg-muted">{bar.label}</span>
                <span className="h-3 overflow-hidden rounded-full bg-subtle">
                  <span className="block h-full rounded-full bg-brand-600 transition-[width] duration-500" style={{ width: `${funnel.started ? bar.width : 0}%` }} />
                </span>
                <span className="text-right font-medium tabular-nums text-fg">{bar.value.toLocaleString("en-US")}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section title={t("stats.byProduct")} flush>
          {totalViews === 0 && funnel.started === 0 ? (
            <EmptyState compact icon={FiBarChart2} title={t("stats.noDataTitle")} body={t("stats.noData")} />
          ) : (
            // Six columns don't fit a phone; the table scrolls inside its
            // own panel rather than pushing the page sideways.
            <div className="overflow-x-auto">
              <table className="w-full min-w-[40rem] text-sm">
                <thead>
                  <tr className="border-b border-line bg-subtle/50 text-xs text-fg-muted">
                    <th scope="col" className="py-2.5 pl-4 pr-3 text-left font-medium sm:pl-6">{t("dash.colProduct")}</th>
                    <th scope="col" className="px-3 py-2.5 text-left font-medium">{t("stats.views")}</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-medium">QR</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-medium">{t("stats.clicks")}</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-medium">{t("stats.ctr")}</th>
                    <th scope="col" className="py-2.5 pl-3 pr-4 text-right font-medium sm:pr-6">{t("stats.recommended")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {rows.map(({ product: p, stats: s }) => (
                    <tr key={p.id}>
                      <th scope="row" className="py-2.5 pl-4 pr-3 text-left font-medium text-fg sm:pl-6">
                        <span className="flex items-center gap-2.5">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md border border-line bg-subtle/60">
                            <Image src={p.imageUrl} alt="" width={32} height={32} unoptimized onError={onImageError} className="h-full w-full object-contain p-0.5" />
                          </span>
                          <span className="max-w-[14rem] truncate">{localized(locale, p.name_mn, p.name_en)}</span>
                        </span>
                      </th>
                      <td className="px-3 py-2.5">
                        <span className="flex items-center gap-2">
                          <span className="h-1.5 w-24 overflow-hidden rounded-full bg-subtle">
                            <span className="block h-full rounded-full bg-brand-500" style={{ width: `${(s.views / maxViews) * 100}%` }} />
                          </span>
                          <span className="tabular-nums text-fg">{s.views.toLocaleString("en-US")}</span>
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-fg-muted">{s.qrViews.toLocaleString("en-US")}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-fg">{s.clicks.toLocaleString("en-US")}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-fg-muted">{s.views > 0 ? `${pct(s.clicks, s.views)}%` : "—"}</td>
                      <td className="py-2.5 pl-3 pr-4 text-right tabular-nums text-fg-muted sm:pr-6">
                        {inAnyQuiz.has(p.id) || s.recommended > 0 ? s.recommended.toLocaleString("en-US") : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      </div>
    </>
  );
}
