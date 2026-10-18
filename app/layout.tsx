import type { Metadata } from "next";
import { Wix_Madefor_Display, Wix_Madefor_Text } from "next/font/google";
import "./globals.css";
import { ThemeProvider, themeInitScript } from "@/components/ThemeProvider";

// Wix Madefor — one family drawn in two optical sizes: Display for
// headings (tight, confident at large sizes — the product-title look of the
// design concept), Text for everything read at body size. Both cover
// cyrillic-ext, which is where Mongolian's Ө and Ү live; a font without it
// silently renders those two letters in a fallback face mid-word.
const display = Wix_Madefor_Display({
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
  variable: "--font-display",
  display: "swap",
});
const text = Wix_Madefor_Text({
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
  variable: "--font-sans",
  display: "swap",
});

// No LanguageProvider here: it needs the locale, which only exists on the
// [locale] segment below this. app/[locale]/layout.tsx and app/not-found.tsx
// each mount their own, inside a NextIntlClientProvider carrying that
// request's messages. `lang` below is the static default — LanguageProvider
// corrects the attribute per locale (see its comment for why it can't be
// server-set from here).

export const metadata: Metadata = {
  title: "Нью Верамед",
  description: "Танд тохирох витамин, нэмэлт тэжээлийг богино асуулгаар олоорой.",
  icons: { icon: "/icon.png" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="mn" className={`${text.variable} ${display.variable}`} suppressHydrationWarning>
      <head>
        {/* Sets the dark class before first paint — without this, dark-theme
            users get a white flash on every page load. */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
