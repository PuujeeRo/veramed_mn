"use client";

import { useLanguage } from "@/lib/i18n";

const SECTIONS = [
  { title: "privacy.s1Title", body: "privacy.s1Body" },
  { title: "privacy.s2Title", body: "privacy.s2Body" },
  { title: "privacy.s3Title", body: "privacy.s3Body" },
];

export default function PrivacyPage() {
  const { t } = useLanguage();

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="text-2xl font-semibold tracking-tight text-fg sm:text-4xl">{t("privacy.title")}</h1>

      <div className="mt-10 flex flex-col gap-8 text-sm leading-relaxed text-fg-muted">
        {SECTIONS.map((s) => (
          <section key={s.title}>
            <h2 className="mb-2 text-lg font-semibold text-fg">{t(s.title)}</h2>
            <p>{t(s.body)}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
