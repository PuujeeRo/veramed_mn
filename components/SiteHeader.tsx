"use client";

// The company site's header — every visitor-facing page sits under it
// (app/[locale]/(site)/layout.tsx). The dashboard and account pages do not:
// those are the manager's tools, with their own frame (DashboardShell).
//
// Navigation is a pill group (the design concept's "Products / Contact"
// pills): the current page is the raised pill. Below `md` the pills
// collapse into a menu; the logo, the quiz button and the manager's
// sign-in (an icon only, on phones) stay.

import { useEffect, useState } from "react";
import Image from "next/image";
import { FiArrowRight, FiLogIn, FiMenu, FiX } from "react-icons/fi";
import { Link, usePathname } from "@/lib/navigation";
import { useLanguage } from "@/lib/i18n";
import { onImageError } from "@/lib/media";
import { Brand } from "@/lib/types";
import Controls from "./Controls";

const navItems = [
  { href: "/", key: "nav.home" },
  { href: "/products", key: "nav.products" },
  { href: "/about", key: "nav.about" },
  { href: "/contact", key: "nav.contact" },
];

export default function SiteHeader({ brand }: { brand: Brand }) {
  // lib/navigation's usePathname, not next/navigation's — it returns the
  // path without the locale prefix, so "/en/about" still matches "/about".
  const pathname = usePathname();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);

  // Close the menu when the route changes.
  useEffect(() => setOpen(false), [pathname]);

  const isCurrent = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`) || (href === "/products" && pathname.startsWith("/p/"));

  return (
    <header className="sticky top-0 z-sticky border-b border-line/70 bg-page/85 backdrop-blur-md">
      <div aria-hidden="true" className="brand-gradient h-1" />
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/" className="flex min-w-0 items-center gap-2.5">
          {/* object-contain, no rounding: the logo is a shape on a
              transparent background, not a square tile to crop. */}
          <Image src={brand.logoUrl} alt="" width={36} height={36} unoptimized onError={onImageError} className="h-9 w-9 shrink-0 object-contain" />
          <span className="truncate font-display text-base font-bold tracking-tight text-fg sm:text-lg">{brand.name}</span>
        </Link>

        <nav aria-label={t("nav.menu")} className="hidden md:block">
          <ul className="flex items-center gap-1 rounded-full border border-line bg-surface/70 p-1 shadow-xs">
            {navItems.map((item) => {
              const current = isCurrent(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={current ? "page" : undefined}
                    className={`flex h-8 items-center whitespace-nowrap rounded-full px-4 text-sm font-medium transition ${
                      current ? "bg-fg text-page shadow-xs" : "text-fg-muted hover:bg-subtle hover:text-fg"
                    }`}
                  >
                    {t(item.key)}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <Controls className="hidden lg:flex" />
          <Link
            href="/quiz"
            className="group hidden h-10 items-center gap-1.5 whitespace-nowrap rounded-full bg-brand-600 pl-4 pr-3.5 text-sm font-semibold text-white shadow-xs transition hover:bg-brand-700 min-[400px]:inline-flex"
          >
            {t("landing.viewQuiz")}
            <FiArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link
            href="/login"
            aria-label={t("login.title")}
            title={t("login.title")}
            className="inline-flex h-10 min-w-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-line bg-surface px-2.5 text-sm font-medium text-fg-muted transition hover:bg-subtle hover:text-fg sm:px-4"
          >
            <FiLogIn size={16} className="shrink-0" />
            <span className="hidden sm:inline">{t("login.title")}</span>
          </Link>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="site-menu"
            aria-label={t("nav.menu")}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface text-fg transition hover:bg-subtle lg:hidden"
          >
            {open ? <FiX size={18} /> : <FiMenu size={18} />}
          </button>
        </div>
      </div>

      {open && (
        <div id="site-menu" className="border-t border-line bg-surface px-4 pb-5 pt-3 motion-safe:animate-fade-in lg:hidden">
          <nav aria-label={t("nav.menu")} className="md:hidden">
            <ul className="flex flex-col gap-1">
              {[...navItems, { href: "/quiz", key: "landing.viewQuiz" }].map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isCurrent(item.href) ? "page" : undefined}
                    className={`flex h-11 items-center rounded-xl px-3 text-[0.9375rem] font-medium transition ${
                      isCurrent(item.href) ? "bg-subtle text-fg" : "text-fg-muted hover:bg-subtle hover:text-fg"
                    }`}
                  >
                    {t(item.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="mt-3 border-t border-line pt-4 md:mt-0 md:border-0 md:pt-0">
            <Controls />
          </div>
        </div>
      )}
    </header>
  );
}
