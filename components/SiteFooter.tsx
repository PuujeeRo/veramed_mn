"use client";

import Image from "next/image";
import { FiFacebook, FiInstagram, FiMail, FiMapPin, FiPhone } from "react-icons/fi";
import { Link } from "@/lib/navigation";
import { localized, useLanguage } from "@/lib/i18n";
import { Brand } from "@/lib/types";

export default function SiteFooter({ brand }: { brand: Brand }) {
  const { locale, t } = useLanguage();
  const c = brand.contact ?? {};

  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-10 text-sm text-fg-muted sm:px-6">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-xs">
            {/* The full logo lockup. Its "MEDICAL COMPANY" line is black, so
                it always sits on a white chip — invisible in the light
                theme, and what keeps it legible in the dark one. */}
            <span className="inline-block rounded-xl bg-white p-2.5">
              <Image
                src="/logo-full.png"
                alt={brand.name}
                width={988}
                height={326}
                unoptimized
                className="h-12 w-auto"
              />
            </span>
            <p className="mt-2 text-fg-faint">{localized(locale, brand.quizIntro_mn, brand.quizIntro_en)}</p>
          </div>

          {/* Two columns don't sit side by side at 280px — stacked there,
              a row from 360px. */}
          <div className="grid gap-x-10 gap-y-8 min-[360px]:grid-cols-2">
            <div className="flex flex-col gap-2">
              <span className="font-medium text-fg">{t("footer.site")}</span>
              <Link href="/products" className="hover:text-fg">{t("nav.products")}</Link>
              <Link href="/quiz" className="hover:text-fg">{t("landing.viewQuiz")}</Link>
              <Link href="/about" className="hover:text-fg">{t("nav.about")}</Link>
              <Link href="/privacy" className="hover:text-fg">{t("footer.privacy")}</Link>
            </div>
            <div className="flex min-w-0 flex-col gap-2">
              <span className="font-medium text-fg">{t("nav.contact")}</span>
              {c.phone && (
                <a href={`tel:${c.phone}`} className="inline-flex items-center gap-2 tabular-nums hover:text-fg">
                  <FiPhone size={14} className="shrink-0" /> {c.phone}
                </a>
              )}
              {c.email && (
                <a href={`mailto:${c.email}`} className="inline-flex min-w-0 items-center gap-2 hover:text-fg">
                  <FiMail size={14} className="shrink-0" /> <span className="truncate">{c.email}</span>
                </a>
              )}
              {c.address && (
                <span className="inline-flex items-start gap-2">
                  <FiMapPin size={14} className="mt-0.5 shrink-0" /> {c.address}
                </span>
              )}
              {c.facebook && (
                <a href={c.facebook} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:text-fg">
                  <FiFacebook size={14} className="shrink-0" /> Facebook
                </a>
              )}
              {c.instagram && (
                <a href={c.instagram} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:text-fg">
                  <FiInstagram size={14} className="shrink-0" /> Instagram
                </a>
              )}
              <Link href="/contact" className="hover:text-fg">{t("footer.allContact")}</Link>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t border-line pt-6 text-xs text-fg-faint">
          <p className="max-w-[80ch]">{t("footer.disclaimer")}</p>
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
            <span>© {new Date().getFullYear()} {brand.name}</span>
            <Link href="/login" className="hover:text-fg-muted">{t("footer.managerLogin")}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
