"use client";

// veramed — translation lookup.
//
// The locale and the message catalog are both resolved on the SERVER and
// passed in as props (app/[locale]/layout.tsx → lib/messages.ts), so the
// server renders the right language on first paint and only the active
// locale ships. This provider exposes the `t()` API the app's ~46 call
// sites already use.
//
// It deliberately holds no state and runs no detection effect. The previous
// version defaulted to "mn", then corrected from localStorage/
// navigator.language in a useEffect, then got corrected AGAIN by a
// LocaleSync component reading the URL segment — so an English visitor got
// Mongolian in the server-rendered HTML and a flash of it on every page
// load. The URL is the single source of truth for language; there is
// nothing left to detect, sync, or persist.
//
// Switching language is therefore navigation, not state: see
// components/LanguageSelector.tsx, which routes to the other locale's
// version of the current page.

import { createContext, useContext, useEffect, ReactNode } from "react";

export type Locale = "mn" | "en";

interface LanguageContextValue {
  locale: Locale;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({
  locale,
  messages,
  children,
}: {
  locale: Locale;
  messages: Record<string, string>;
  children: ReactNode;
}) {
  // `lang` can't be set from the server here: Next.js requires <html> to
  // live in the ROOT layout, which sits above app/[locale]/ and so never
  // sees the locale segment. This only swaps an attribute, never content,
  // so it costs no visible flash — unlike the text-level detection this
  // provider used to do.
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const t = (key: string, vars?: Record<string, string | number>) => {
    let str = messages[key] ?? key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        str = str.replace(`{${k}}`, String(v));
      }
    }
    return str;
  };

  return (
    <LanguageContext.Provider value={{ locale, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used inside LanguageProvider");
  return ctx;
}

/** Pick the field matching the current locale, falling back to MN.
 *  Brand-authored content (product names, descriptions, quiz text) is stored
 *  as _mn/_en columns rather than in the message catalog, so it resolves
 *  here rather than through t(). */
export function localized(
  locale: Locale,
  mnValue: string,
  enValue?: string
): string {
  if (locale === "en" && enValue) return enValue;
  return mnValue;
}
