"use client";

// Every route (marketing, admin, brand) is locale-routed, and the URL is
// the ONLY source of truth for language — the server reads it, loads that
// catalog, and renders in it (app/[locale]/layout.tsx). So switching
// language here means navigating to the other locale's version of the
// current page; there is no context state to flip and nothing persisted
// client-side to keep in sync. `useRouter().replace(path, { locale })` is
// next-intl's own intended pattern for exactly this.

import { useRouter, usePathname } from "@/lib/navigation";
import { useLanguage, Locale } from "@/lib/i18n";

export default function LanguageSelector() {
  const { locale } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();

  function choose(next: Locale) {
    router.replace(pathname, { locale: next });
  }

  return (
    <div className="inline-flex rounded-full border border-line bg-surface p-1 text-sm shadow-sm">
      <button
        onClick={() => choose("mn")}
        className={`rounded-full px-3 py-1 transition ${
          locale === "mn"
            ? "bg-brand-600 text-white"
            : "text-fg-muted hover:text-fg"
        }`}
      >
        MN
      </button>
      <button
        onClick={() => choose("en")}
        className={`rounded-full px-3 py-1 transition ${
          locale === "en"
            ? "bg-brand-600 text-white"
            : "text-fg-muted hover:text-fg"
        }`}
      >
        EN
      </button>
    </div>
  );
}
