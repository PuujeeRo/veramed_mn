"use client";

// Presentational half of the global 404 (app/not-found.tsx). Split out
// because that file has to be a Server Component — it loads the message
// catalog itself, since it sits outside app/[locale]/ and so inherits
// neither the locale segment nor its providers.
//
// Plain next/link on purpose: this renders outside the locale tree (see
// above), and both targets are valid unprefixed (MN) routes.

import Link from "next/link";
import { FiArrowLeft, FiBox } from "react-icons/fi";
import { useLanguage } from "@/lib/i18n";
import Controls from "@/components/Controls";
import LostInSpace from "@/components/LostInSpace";

export default function NotFoundContent() {
  const { t } = useLanguage();

  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-2xl flex-col px-6 py-6">
      <div className="flex justify-end">
        <Controls />
      </div>

      <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
        <LostInSpace />

        <p className="mt-6 font-mono text-sm tracking-[0.3em] text-fg-faint">{t("notFound.code")}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-fg sm:text-4xl">{t("notFound.title")}</h1>
        <p className="mt-3 max-w-md text-fg-muted">{t("notFound.body")}</p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-brand-700"
          >
            <FiArrowLeft size={15} /> {t("notFound.home")}
          </Link>
          <Link
            href="/products"
            className="inline-flex items-center gap-2 rounded-full border border-line px-6 py-2.5 text-sm font-medium text-fg transition hover:border-fg-faint"
          >
            <FiBox size={15} /> {t("notFound.products")}
          </Link>
        </div>
      </div>
    </main>
  );
}
