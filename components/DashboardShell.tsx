"use client";

// The frame every manager page sits in: the dashboard's sections, a single
// product's editor, and the account page. One component, so they can't
// drift into looking like different apps.
//
// lg+: a fixed left sidebar — company, navigation grouped by what it's
// for, and at the bottom the way out to the public site and the signed-in
// user's menu. Below lg: a slim top bar whose menu button slides the same
// sidebar in from the left.
//
// Sections are real links to `/dashboard?tab=…` — the URL is the source of
// truth for the active section (see DashboardView).

import Image from "next/image";
import { ReactNode, useEffect, useState } from "react";
import { IconType } from "react-icons";
import {
  FiBarChart2,
  FiBox,
  FiChevronDown,
  FiExternalLink,
  FiGrid,
  FiHelpCircle,
  FiLayout,
  FiLogOut,
  FiMenu,
  FiTag,
  FiUser,
  FiX,
} from "react-icons/fi";
import { Link, useRouter } from "@/lib/navigation";
import { useLanguage } from "@/lib/i18n";
import { onImageError } from "@/lib/media";
import { Brand } from "@/lib/types";
import Controls from "./Controls";
import Menu from "./ui/Menu";
import { ToastProvider } from "./ui/Toast";

export type DashTab = "overview" | "products" | "categories" | "quiz" | "site" | "stats";
type ShellActive = DashTab | "account";

interface NavItem {
  key: DashTab;
  labelKey: string;
  icon: IconType;
}

export const NAV_GROUPS: { labelKey: string | null; items: NavItem[] }[] = [
  { labelKey: null, items: [{ key: "overview", labelKey: "dash.tabOverview", icon: FiGrid }] },
  {
    labelKey: "dash.groupCatalog",
    items: [
      { key: "products", labelKey: "dash.tabProducts", icon: FiBox },
      { key: "categories", labelKey: "dash.tabCategories", icon: FiTag },
    ],
  },
  {
    labelKey: "dash.groupVisitors",
    items: [
      { key: "quiz", labelKey: "dash.tabQuiz", icon: FiHelpCircle },
      { key: "stats", labelKey: "dash.tabStats", icon: FiBarChart2 },
    ],
  },
  { labelKey: "dash.groupSettings", items: [{ key: "site", labelKey: "dash.tabSite", icon: FiLayout }] },
];

export const DASH_TABS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

export interface ShellUser {
  name: string | null;
  email: string | null;
}

interface DashboardShellProps {
  brand: Brand;
  active: ShellActive;
  user?: ShellUser | null;
  /** Shown beside "Products" when known. */
  productCount?: number;
  children: ReactNode;
}

function initials(user?: ShellUser | null) {
  const source = (user?.name || user?.email || "?").trim();
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "?") + (parts[1]?.[0] ?? "")).toUpperCase();
}

export default function DashboardShell({ brand, active, user, productCount, children }: DashboardShellProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close the mobile menu on Escape, and lock page scroll while it's open.
  useEffect(() => {
    if (!mobileOpen) return;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMobileOpen(false);
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [mobileOpen]);

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    router.push("/login");
    router.refresh();
  }

  const identity = (
    <Link href="/dashboard" className="flex min-w-0 items-center gap-2.5 rounded-lg transition hover:opacity-80">
      <Image
        src={brand.logoUrl}
        alt=""
        width={36}
        height={36}
        unoptimized
        onError={onImageError}
        className="h-9 w-9 shrink-0 object-contain"
      />
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-fg">{brand.name}</span>
        <span className="block truncate text-xs text-fg-muted">{t("dash.title")}</span>
      </span>
    </Link>
  );

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 px-4 pb-4 pt-5">
        {identity}
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          aria-label={t("common.close")}
          className="icon-btn lg:hidden"
        >
          <FiX size={18} />
        </button>
      </div>

      <nav aria-label={t("dash.title")} className="flex-1 overflow-y-auto px-3 pb-4">
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi} className={gi > 0 ? "mt-5" : ""}>
            {group.labelKey && <p className="eyebrow mb-1.5 px-3">{t(group.labelKey)}</p>}
            <ul className="flex flex-col gap-0.5">
              {group.items.map(({ key, labelKey, icon: Icon }) => {
                const current = key === active;
                return (
                  <li key={key}>
                    <Link
                      href={key === "overview" ? "/dashboard" : `/dashboard?tab=${key}`}
                      scroll={false}
                      onClick={() => setMobileOpen(false)}
                      aria-current={current ? "page" : undefined}
                      className={`group relative flex h-9 items-center gap-2.5 rounded-lg px-3 text-sm font-medium transition ${
                        current ? "bg-brand-50 text-brand-700" : "text-fg-muted hover:bg-subtle hover:text-fg"
                      }`}
                    >
                      {current && (
                        <span aria-hidden="true" className="absolute inset-y-2 -left-3 w-1 rounded-r-full bg-brand-600" />
                      )}
                      <Icon size={16} className="shrink-0" />
                      <span className="min-w-0 flex-1 truncate">{t(labelKey)}</span>
                      {key === "products" && productCount !== undefined && (
                        <span
                          className={`rounded-md px-1.5 text-xs tabular-nums ${
                            current ? "bg-brand-100 text-brand-700" : "bg-subtle text-fg-muted group-hover:bg-line"
                          }`}
                        >
                          {productCount}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-line p-3">
        <Link href="/" target="_blank" className="btn-secondary btn-sm w-full">
          <FiExternalLink size={14} /> {t("brandEd.preview")}
        </Link>

        <div className="mt-3 flex items-center gap-2">
          <Menu
            label={t("account.menu")}
            align="left"
            triggerClassName="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg p-1.5 text-left transition hover:bg-subtle"
            trigger={
              <>
                <span
                  aria-hidden="true"
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold ${
                    active === "account" ? "bg-brand-600 text-white" : "bg-brand-50 text-brand-700"
                  }`}
                >
                  {initials(user)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-fg">{user?.name || t("account.manager")}</span>
                  {user?.email && <span className="block truncate text-xs text-fg-muted">{user.email}</span>}
                </span>
                <FiChevronDown size={14} className="shrink-0 text-fg-faint" />
              </>
            }
            items={[
              { label: t("account.title"), icon: FiUser, onSelect: () => router.push("/account") },
              { label: t("account.logout"), icon: FiLogOut, onSelect: signOut, danger: true },
            ]}
          />
        </div>
        <Controls className="mt-3 justify-between px-1" />
      </div>
    </div>
  );

  return (
    <ToastProvider>
      <a
        href="#dash-main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-toast focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2 focus:shadow-pop"
      >
        {t("common.skipToContent")}
      </a>

      <div className="min-h-[100dvh] bg-page">
        {/* Desktop sidebar */}
        <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-line bg-surface lg:block">{sidebar}</aside>

        {/* Mobile top bar + slide-out sidebar */}
        <header className="sticky top-0 z-sticky flex h-14 items-center justify-between gap-3 border-b border-line bg-surface/95 px-3 backdrop-blur lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label={t("nav.menu")}
            aria-expanded={mobileOpen}
            className="icon-btn"
          >
            <FiMenu size={20} />
          </button>
          <div className="min-w-0 flex-1">{identity}</div>
          <Link href="/" target="_blank" aria-label={t("brandEd.preview")} title={t("brandEd.preview")} className="icon-btn">
            <FiExternalLink size={17} />
          </Link>
        </header>
        {mobileOpen && (
          <div className="fixed inset-0 z-overlay lg:hidden">
            <div aria-hidden="true" onClick={() => setMobileOpen(false)} className="absolute inset-0 bg-black/40 motion-safe:animate-fade-in" />
            <aside className="absolute inset-y-0 left-0 w-[17rem] max-w-[85vw] bg-surface shadow-pop motion-safe:animate-slide-in-left">
              {sidebar}
            </aside>
          </div>
        )}

        <main id="dash-main" className="lg:pl-64">
          <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">{children}</div>
        </main>
      </div>
    </ToastProvider>
  );
}
