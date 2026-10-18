// Wraps every page in the app — the public site, the dashboard and the
// account page all live under app/[locale]/. app/api/** stays a sibling at
// the true root: API routes never carry a locale segment.
//
// This is where SSR-per-locale is established: the catalog is loaded
// server-side from the URL's locale segment (lib/messages.ts) and handed
// to LanguageProvider as a prop, so the HTML leaving the server is already
// in the right language and only that locale is serialized.
//
// NextIntlClientProvider carries locale ONLY (no messages) — it exists so
// lib/navigation.ts's Link/useRouter can build locale-aware paths. See
// lib/messages.ts for why translations don't go through next-intl.

import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { routing } from "@/lib/routing";
import { getLocaleMessages } from "@/lib/messages";
import { LanguageProvider } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  if (!routing.locales.includes(params.locale as Locale)) notFound();
  const locale = params.locale as Locale;
  const messages = await getLocaleMessages(locale);

  return (
    <NextIntlClientProvider locale={locale}>
      <LanguageProvider locale={locale} messages={messages}>
        {children}
      </LanguageProvider>
    </NextIntlClientProvider>
  );
}
