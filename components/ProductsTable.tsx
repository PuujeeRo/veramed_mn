"use client";

// The product list on the dashboard's Products section.
//
//   - Status tabs with live counts (All / Published / Hidden), seeded from
//     `?status=` so Overview's links land pre-filtered.
//   - Search, a category filter and a sort — all local: a single company's
//     catalog never needs a server round trip to filter.
//   - md+: a table. Clicking anywhere on a row opens the editor; the
//     row's own controls (Edit, the ⋯ menu) don't. Below md: one card per
//     product with the same information.
//   - Row menu: view the public page, copy its link, QR code — the things a
//     manager does with a product's link.

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import {
  FiBox,
  FiCheck,
  FiCopy,
  FiEdit2,
  FiExternalLink,
  FiMinus,
  FiMoreHorizontal,
  FiPlus,
  FiSearch,
  FiX,
} from "react-icons/fi";
import { MdQrCode2 } from "react-icons/md";
import { Link, useRouter } from "@/lib/navigation";
import { Category, Product, Quiz } from "@/lib/types";
import { localized, useLanguage } from "@/lib/i18n";
import { getCategories } from "@/lib/categories";
import { onImageError } from "@/lib/media";
import { useOrigin } from "@/lib/useOrigin";
import StatusPill from "./ui/StatusPill";
import Menu from "./ui/Menu";
import EmptyState from "./ui/EmptyState";
import { useToast } from "./ui/Toast";
import { QrDialog } from "./QrCodeButton";

type StatusFilter = "all" | "active" | "inactive";
type SortKey = "manual" | "name" | "price-asc" | "price-desc";

const MAX_CHIPS = 2;

interface ProductsTableProps {
  products: Product[];
  /** For the Quiz column: which quizzes each product is in. */
  quizzes: Quiz[];
  onAdd: () => void;
}

export default function ProductsTable({ products, quizzes, onAdd }: ProductsTableProps) {
  const { locale, t } = useLanguage();
  const router = useRouter();
  const origin = useOrigin();
  const toast = useToast();
  const searchParams = useSearchParams();

  const initialStatus = searchParams.get("status");
  const [status, setStatus] = useState<StatusFilter>(
    initialStatus === "active" || initialStatus === "inactive" ? initialStatus : "all"
  );
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState<SortKey>("manual");
  const [categories, setCategories] = useState<Category[]>([]);
  const [qrFor, setQrFor] = useState<Product | null>(null);

  useEffect(() => {
    getCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  const name = (p: Product) => localized(locale, p.name_mn, p.name_en);
  const categoryName = (slug: string) => {
    const c = categories.find((x) => x.slug === slug);
    return c ? localized(locale, c.name_mn, c.name_en) : slug;
  };

  const counts = {
    all: products.length,
    active: products.filter((p) => p.status === "active").length,
    inactive: products.filter((p) => p.status === "inactive").length,
  };

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = products.filter((p) => {
      if (status !== "all" && p.status !== status) return false;
      if (category && !p.categories.includes(category)) return false;
      if (!q) return true;
      return `${p.name_mn} ${p.name_en ?? ""}`.toLowerCase().includes(q);
    });
    const label = (p: Product) => localized(locale, p.name_mn, p.name_en);
    if (sort === "name") list.sort((a, b) => label(a).localeCompare(label(b), locale));
    if (sort === "price-asc") list.sort((a, b) => a.price - b.price);
    if (sort === "price-desc") list.sort((a, b) => b.price - a.price);
    return list;
  }, [products, status, category, search, sort, locale]);

  const filtered = search.trim() !== "" || category !== "" || status !== "all";
  const editHref = (p: Product) => `/dashboard/products/${p.id}`;
  // Public link — deliberately unprefixed (MN-canonical): a printed QR
  // code must not depend on the manager's current language.
  const publicUrl = (p: Product) => (origin ? `${origin}/p/${p.id}` : `/p/${p.id}`);

  async function copyLink(p: Product) {
    try {
      await navigator.clipboard.writeText(publicUrl(p));
      toast(t("common.linkCopied"));
    } catch {
      toast(t("common.copyFailed"), "error");
    }
  }

  function rowMenu(p: Product) {
    const published = p.status === "active";
    return (
      <Menu
        label={t("dash.moreActions")}
        trigger={<FiMoreHorizontal size={18} />}
        items={[
          { label: t("dash.edit"), icon: FiEdit2, onSelect: () => router.push(editHref(p)) },
          {
            label: t("prodEd.viewPage"),
            icon: FiExternalLink,
            onSelect: () => window.open(publicUrl(p), "_blank", "noopener"),
            disabled: !published,
          },
          { label: t("common.copyLink"), icon: FiCopy, onSelect: () => copyLink(p), disabled: !published || !origin },
          { label: t("common.qrCode"), icon: MdQrCode2, onSelect: () => setQrFor(p), disabled: !published || !origin },
        ]}
      />
    );
  }

  /** Row click → editor, unless the click was on one of the row's own controls. */
  function onRowClick(e: React.MouseEvent, p: Product) {
    if ((e.target as HTMLElement).closest("a,button,[role=menu]")) return;
    router.push(editHref(p));
  }

  const thumb = (p: Product, size: string) => (
    <span className={`flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line bg-subtle/60 ${size}`}>
      <Image src={p.imageUrl} alt="" width={64} height={64} unoptimized onError={onImageError} className="h-full w-full object-contain p-1" />
    </span>
  );

  const statusPill = (p: Product) =>
    p.status === "active" ? (
      <StatusPill tone="success">{t("dash.statusPublished")}</StatusPill>
    ) : (
      <StatusPill tone="neutral">{t("dash.statusHidden")}</StatusPill>
    );

  const chips = (p: Product) =>
    p.categories.length === 0 ? (
      <span className="text-xs text-fg-faint">{t("dash.noCategory")}</span>
    ) : (
      <span className="flex flex-wrap gap-1">
        {p.categories.slice(0, MAX_CHIPS).map((slug) => (
          <span key={slug} className="rounded-md bg-subtle px-1.5 py-0.5 text-xs text-fg-muted ring-1 ring-inset ring-line">
            {categoryName(slug)}
          </span>
        ))}
        {p.categories.length > MAX_CHIPS && (
          <span className="rounded-md px-1 py-0.5 text-xs text-fg-faint">+{p.categories.length - MAX_CHIPS}</span>
        )}
      </span>
    );

  // In at least one quiz, with a category it can be matched on.
  const quizCount = (p: Product) => quizzes.filter((q) => q.productIds.includes(p.id)).length;
  const inQuiz = (p: Product) => quizCount(p) > 0 && p.categories.length > 0;

  const quizMark = (p: Product) =>
    inQuiz(p) ? (
      <span
        title={t("dash.inQuizzes", { n: quizCount(p) })}
        className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
      >
        <FiCheck size={14} aria-label={t("dash.inQuiz")} />
      </span>
    ) : (
      <span title={t("dash.notInQuiz")} className="inline-flex h-6 w-6 items-center justify-center text-fg-faint">
        <FiMinus size={14} aria-label={t("dash.notInQuiz")} />
      </span>
    );

  if (products.length === 0) {
    return (
      <div className="card">
        <EmptyState
          icon={FiBox}
          title={t("dash.emptyTitle")}
          body={t("dash.emptyBody")}
          action={
            <button type="button" onClick={onAdd} className="btn-primary">
              <FiPlus size={16} /> {t("dash.addProduct")}
            </button>
          }
        />
      </div>
    );
  }

  const tabs: { key: StatusFilter; label: string }[] = [
    { key: "all", label: t("dash.filterAll") },
    { key: "active", label: t("dash.statusPublished") },
    { key: "inactive", label: t("dash.statusHidden") },
  ];

  return (
    <div className="card overflow-hidden">
      {/* Status tabs */}
      <div role="tablist" aria-label={t("dash.colStatus")} className="flex gap-1 overflow-x-auto border-b border-line px-3 pt-1 sm:px-4">
        {tabs.map(({ key, label }) => {
          const on = status === key;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setStatus(key)}
              className={`-mb-px flex h-11 items-center gap-2 whitespace-nowrap border-b-2 px-3 text-sm font-medium transition ${
                on ? "border-brand-600 text-fg" : "border-transparent text-fg-muted hover:text-fg"
              }`}
            >
              {label}
              <span className={`rounded-md px-1.5 text-xs tabular-nums ${on ? "bg-brand-50 text-brand-700" : "bg-subtle text-fg-muted"}`}>
                {counts[key]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-line p-3 sm:px-4">
        <div className="relative min-w-[12rem] flex-1">
          <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-faint" size={15} />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("dash.searchProducts")}
            aria-label={t("dash.searchProducts")}
            className="field pl-9"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-label={t("dash.filterCategory")}
          className="field w-auto min-w-[10rem] flex-1 sm:flex-none"
        >
          <option value="">{t("dash.allCategories")}</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {localized(locale, c.name_mn, c.name_en)}
            </option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          aria-label={t("dash.sortBy")}
          className="field w-auto min-w-[9rem] flex-1 sm:flex-none"
        >
          <option value="manual">{t("dash.sortManual")}</option>
          <option value="name">{t("dash.sortName")}</option>
          <option value="price-asc">{t("dash.sortPriceAsc")}</option>
          <option value="price-desc">{t("dash.sortPriceDesc")}</option>
        </select>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          compact
          icon={FiSearch}
          title={t("common.noSearchResults")}
          action={
            filtered && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setCategory("");
                  setStatus("all");
                }}
                className="btn-secondary btn-sm"
              >
                <FiX size={14} /> {t("dash.clearFilters")}
              </button>
            )
          }
        />
      ) : (
        <>
          {/* md+: table */}
          <table className="hidden w-full text-sm md:table">
            <thead>
              <tr className="border-b border-line bg-subtle/50 text-left text-xs text-fg-muted">
                <th scope="col" className="py-2.5 pl-4 pr-3 font-medium sm:pl-5">{t("dash.colProduct")}</th>
                <th scope="col" className="hidden px-3 py-2.5 font-medium lg:table-cell">{t("dashCat.title")}</th>
                <th scope="col" className="px-3 py-2.5 text-right font-medium">{t("dash.colPrice")}</th>
                <th scope="col" className="px-3 py-2.5 font-medium">{t("dash.colStatus")}</th>
                <th scope="col" className="px-3 py-2.5 text-center font-medium">{t("dash.colQuiz")}</th>
                <th scope="col" className="py-2.5 pl-3 pr-4 sm:pr-5">
                  <span className="sr-only">{t("dash.moreActions")}</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {visible.map((p) => (
                <tr key={p.id} onClick={(e) => onRowClick(e, p)} className="cursor-pointer transition hover:bg-subtle/50">
                  <td className="py-3 pl-4 pr-3 sm:pl-5">
                    <div className="flex items-center gap-3">
                      {thumb(p, "h-11 w-11")}
                      <div className="min-w-0">
                        <Link href={editHref(p)} className="block truncate font-medium text-fg hover:text-brand-700">
                          {name(p)}
                        </Link>
                        {p.name_en && (
                          <p className="truncate text-xs text-fg-faint">{locale === "mn" ? p.name_en : p.name_mn}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="hidden px-3 py-3 lg:table-cell">{chips(p)}</td>
                  <td className="px-3 py-3 text-right font-medium tabular-nums text-fg">₮{p.price.toLocaleString("en-US")}</td>
                  <td className="px-3 py-3">{statusPill(p)}</td>
                  <td className="px-3 py-3 text-center">{quizMark(p)}</td>
                  <td className="py-3 pl-3 pr-4 sm:pr-5">
                    <div className="flex items-center justify-end gap-1">
                      <Link href={editHref(p)} className="btn-ghost btn-sm">
                        <FiEdit2 size={14} /> {t("dash.edit")}
                      </Link>
                      {rowMenu(p)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Below md: cards */}
          <ul className="divide-y divide-line md:hidden">
            {visible.map((p) => (
              <li
                key={p.id}
                onClick={(e) => onRowClick(e, p)}
                className="flex cursor-pointer items-start gap-3 p-3 transition active:bg-subtle/60"
              >
                {thumb(p, "h-14 w-14")}
                <div className="min-w-0 flex-1">
                  <Link href={editHref(p)} className="block font-medium leading-snug text-fg">
                    {name(p)}
                  </Link>
                  <p className="mt-0.5 text-sm font-medium tabular-nums text-fg-muted">₮{p.price.toLocaleString("en-US")}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {statusPill(p)}
                    {inQuiz(p) && (
                      <StatusPill tone="brand" dot={false}>
                        {t("dash.inQuiz")}
                      </StatusPill>
                    )}
                  </div>
                </div>
                {rowMenu(p)}
              </li>
            ))}
          </ul>

          <p className="border-t border-line px-4 py-2.5 text-xs text-fg-muted sm:px-5">
            {t("dash.showingCount", { shown: visible.length, total: products.length })}
          </p>
        </>
      )}

      <QrDialog
        open={qrFor !== null}
        onClose={() => setQrFor(null)}
        url={qrFor ? `${publicUrl(qrFor)}?src=qr` : ""}
        label={qrFor ? name(qrFor) : ""}
      />
    </div>
  );
}
