import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // --font-sans is set by next/font in app/layout.tsx.
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      // Shadows are tinted with the theme's own warm neutral (--shadow), not
      // flat black, so cards sit on the page rather than float above it.
      boxShadow: {
        xs: "0 1px 2px 0 rgb(var(--shadow) / 0.05)",
        card: "0 1px 2px 0 rgb(var(--shadow) / 0.04), 0 1px 3px 0 rgb(var(--shadow) / 0.04)",
        pop: "0 12px 32px -8px rgb(var(--shadow) / 0.22), 0 4px 12px -4px rgb(var(--shadow) / 0.12)",
      },
      zIndex: {
        // One scale for everything that overlaps: sticky bars < menus < overlays < toasts.
        sticky: "30",
        menu: "40",
        overlay: "50",
        toast: "60",
      },
      // Entry motion for a quiz step. Always applied behind `motion-safe:`.
      keyframes: {
        "slide-in-right": {
          from: { transform: "translateX(100%)" },
          to: { transform: "translateX(0)" },
        },
        "slide-in-left": {
          from: { transform: "translateX(-100%)" },
          to: { transform: "translateX(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "pop-in": {
          from: { opacity: "0", transform: "translateY(4px) scale(0.98)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.3s ease-out both",
        "fade-in": "fade-in 0.15s ease-out both",
        "pop-in": "pop-in 0.16s cubic-bezier(0.2, 0.9, 0.3, 1.2) both",
        "slide-in-right": "slide-in-right 0.26s cubic-bezier(0.22, 1, 0.36, 1) both",
        "slide-in-left": "slide-in-left 0.26s cubic-bezier(0.22, 1, 0.36, 1) both",
      },
      colors: {
        brand: {
          50: "rgb(var(--brand-50) / <alpha-value>)",
          100: "rgb(var(--brand-100) / <alpha-value>)",
          200: "rgb(var(--brand-200) / <alpha-value>)",
          500: "rgb(var(--brand-500) / <alpha-value>)",
          600: "rgb(var(--brand-600) / <alpha-value>)",
          700: "rgb(var(--brand-700) / <alpha-value>)",
        },
        // Semantic tokens — defined once per theme in globals.css so
        // components don't need a `dark:` variant on every colour class.
        page: "rgb(var(--page) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        subtle: "rgb(var(--subtle) / <alpha-value>)",
        line: "rgb(var(--line) / <alpha-value>)",
        "line-strong": "rgb(var(--line-strong) / <alpha-value>)",
        fg: "rgb(var(--fg) / <alpha-value>)",
        "fg-muted": "rgb(var(--fg-muted) / <alpha-value>)",
        "fg-faint": "rgb(var(--fg-faint) / <alpha-value>)",
      },
    },
  },
  plugins: [],
};

export default config;
