// Global 404. Sits outside the (marketing) group, so it renders its own
// controls rather than inheriting SiteHeader — and outside app/[locale]/
// entirely, since a truly unmatched path is one next-intl's middleware
// couldn't resolve to a locale segment at all.
//
// That means it inherits neither the locale nor the providers every other
// page gets from app/[locale]/layout.tsx, so it mounts its own here. A
// Server Component on purpose: it loads its catalog before render, exactly
// like the locale layout does, rather than translating client-side after
// paint.
//
// Falls back to the default locale (MN) — there is no locale segment to
// read, and guessing from Accept-Language would reintroduce the
// server/client mismatch this design removes.

import { NextIntlClientProvider } from "next-intl";
import { LanguageProvider } from "@/lib/i18n";
import { routing } from "@/lib/routing";
import { getLocaleMessagesFor } from "@/lib/messages";
import NotFoundContent from "@/components/NotFoundContent";

// Only the keys this subtree renders — NotFoundContent's notFound.*, plus
// ThemeSwitcher's theme.* labels reached via Controls.
//
// Not premature trimming: Next.js renders the not-found boundary into the
// RSC payload of EVERY page, not just 404s, so handing it the full catalog
// shipped a second complete message set (~370 keys) alongside each page's
// own. Measured on /en/pricing before trimming: 11,946 Cyrillic characters
// of dead weight; after: 265.
const NEEDED_PREFIXES = ["notFound.", "theme."];

export default async function NotFound() {
  const locale = routing.defaultLocale as "mn" | "en";
  const messages = await getLocaleMessagesFor(locale, NEEDED_PREFIXES);

  return (
    <NextIntlClientProvider locale={locale}>
      <LanguageProvider locale={locale} messages={messages}>
        <NotFoundContent />
      </LanguageProvider>
    </NextIntlClientProvider>
  );
}
