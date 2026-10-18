"use client";

// One circular button: click it to flip between light and dark. The icon
// shown is whichever theme is currently active (sun = light, moon = dark) —
// clicking swaps both the theme and the icon. Replaces the old two-button
// pill (separate light/dark buttons side by side).
//
// Fixed h-9/w-9 + shrink-0 keep this a true circle everywhere it's placed
// (SiteHeader's flex row, BrandHeader's flex-wrap row, DashboardView's
// header) — the old version sized itself from icon + padding alone, which
// let a tight flex container squish it into an oval.
//
// "system" is still how the theme *initialises* (see ThemeProvider) — a
// first-time visitor gets whatever their OS prefers, and this button shows
// that resolved value already active. Clicking always pins an explicit
// choice, same as before.

import { FiMoon, FiSun } from "react-icons/fi";
import { useLanguage } from "@/lib/i18n";
import { useTheme } from "./ThemeProvider";

export default function ThemeSwitcher() {
  const { resolved, setTheme } = useTheme();
  const { t } = useLanguage();

  const isDark = resolved === "dark";
  const Icon = isDark ? FiMoon : FiSun;
  // Label names the action (what clicking does), not the icon shown —
  // clearer for screen readers than describing what's already on screen.
  const label = t(isDark ? "theme.switchToLight" : "theme.switchToDark");

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      title={label}
      aria-label={label}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-fg-muted transition hover:border-brand-300 hover:text-fg"
    >
      <Icon size={16} />
    </button>
  );
}
