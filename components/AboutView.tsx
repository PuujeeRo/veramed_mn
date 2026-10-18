"use client";

import { FiArrowRight } from "react-icons/fi";
import { Link } from "@/lib/navigation";
import { localized, useLanguage } from "@/lib/i18n";
import { Brand } from "@/lib/types";

export default function AboutView({ brand }: { brand: Brand }) {
  const { locale, t } = useLanguage();
  const aboutHtml = localized(locale, brand.about_mn ?? "", brand.about_en);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="text-2xl font-semibold tracking-tight text-fg sm:text-4xl">{t("nav.about")}</h1>
      <p className="mt-4 text-lg text-fg-muted">{localized(locale, brand.quizIntro_mn, brand.quizIntro_en)}</p>

      {aboutHtml && (
        <div
          className="prose mt-10 max-w-[65ch] text-fg-muted"
          // Sanitized server-side on save (app/api/brands/[brandId]/route.ts).
          dangerouslySetInnerHTML={{ __html: aboutHtml }}
        />
      )}

      <p className="mt-10 rounded-xl border border-line bg-subtle p-4 text-sm leading-relaxed text-fg-muted">
        {t("footer.disclaimer")}
      </p>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/products"
          className="group inline-flex items-center gap-2 rounded-full bg-brand-600 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-brand-700"
        >
          {t("home.seeProducts")}
          <FiArrowRight size={14} className="shrink-0 transition-transform group-hover:translate-x-0.5" />
        </Link>
        <Link
          href="/contact"
          className="rounded-full border border-line px-6 py-2.5 text-sm font-medium text-fg transition hover:border-fg-faint"
        >
          {t("nav.contact")}
        </Link>
      </div>
    </div>
  );
}
