import "server-only";

// Server-side message loading. This is what makes SSR-per-locale work:
// the layout resolves the catalog BEFORE rendering, so the HTML that
// leaves the server is already in the right language, and only that one
// locale is serialized into the payload.
//
// Deliberately NOT next-intl's getMessages(). next-intl validates message
// shape and rejects flat keys containing dots:
//
//   IntlError: INVALID_KEY: Namespace keys cannot contain the character
//   "." as this is used to express nesting.
//
// Our catalogs are flat by design — 368 keys like "nav.home" and
// "signup.slugErr.too-short" — and lib/i18n.tsx's t() looks them up
// directly. Restructuring both files into nested objects (and rewriting
// t() to walk paths) would be a large change to satisfy a library this app
// only uses for URL routing. So next-intl keeps doing routing, and message
// loading lives here.

import type { Locale } from "./i18n";

export type Messages = Record<string, string>;

export async function getLocaleMessages(locale: Locale): Promise<Messages> {
  return (await import(`../locales/${locale}.json`)).default as Messages;
}

/** Subset by key prefix — for boundaries that render on every page and so
 *  must not ship a whole second catalog. See app/not-found.tsx. */
export async function getLocaleMessagesFor(
  locale: Locale,
  prefixes: string[]
): Promise<Messages> {
  const all = await getLocaleMessages(locale);
  return Object.fromEntries(
    Object.entries(all).filter(([key]) => prefixes.some((p) => key.startsWith(p)))
  );
}
