"use client";

// Language + theme switchers as one unit. Every page must render this —
// marketing pages get it via SiteHeader, brand pages (quiz, product,
// dashboard) place it themselves since they don't share that header.

import LanguageSelector from "./LanguageSelector";
import ThemeSwitcher from "./ThemeSwitcher";

export default function Controls({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <LanguageSelector />
      <ThemeSwitcher />
    </div>
  );
}
