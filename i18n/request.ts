// Required by next-intl's Server Component integration —
// NextIntlClientProvider resolves this internally, and deleting the file
// breaks every page with "Couldn't find next-intl config file."
//
// Messages stay empty here ON PURPOSE. next-intl is used for URL routing
// only (lib/routing.ts, lib/navigation.ts, middleware.ts); the actual
// translation catalog is loaded by lib/messages.ts and read through
// lib/i18n.tsx's t(). Returning real messages here would run them through
// next-intl's validator, which rejects this app's flat dotted keys
// ("nav.home", "signup.slugErr.too-short") with INVALID_KEY — see
// lib/messages.ts for the full reasoning.

import { getRequestConfig } from "next-intl/server";
import { routing } from "@/lib/routing";

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  if (!locale || !routing.locales.includes(locale as (typeof routing.locales)[number])) {
    locale = routing.defaultLocale;
  }
  return { locale, messages: {} };
});
