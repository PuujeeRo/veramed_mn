// veramed — next-intl's routing config, shared between middleware.ts
// (locale detection/rewriting) and lib/navigation.ts (locale-aware
// Link/useRouter) so the two can never drift out of sync.

import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["mn", "en"],
  defaultLocale: "mn",
  // MN (default) stays unprefixed — "/quiz", "/products". English gets an
  // explicit "/en/..." prefix.
  localePrefix: "as-needed",
  // No browser-language guessing: a Mongolian company's site opens in
  // Mongolian for everyone (plenty of visitors in Mongolia run an English-
  // language browser). English is one click away and lives at /en — the
  // URL stays the only thing that decides the language.
  localeDetection: false,
});
