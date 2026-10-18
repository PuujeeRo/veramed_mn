"use client";

// Theme state.
//
// "system" is the *initial* state, not a user-facing option: a first-time
// visitor gets whatever their OS prefers, and the switcher (light/dark only)
// shows that resolved value as active. Picking either one pins it, and from
// then on the stored choice always wins — the same precedence rule the
// language selector uses.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

export type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "veramed_theme";

interface ThemeContextValue {
  theme: Theme;
  /** What's actually rendered right now, after resolving "system". */
  resolved: "light" | "dark";
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function systemPrefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function apply(theme: Theme) {
  const dark = theme === "dark" || (theme === "system" && systemPrefersDark());
  document.documentElement.classList.toggle("dark", dark);
  return dark ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");
  const [resolved, setResolved] = useState<"light" | "dark">("light");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as Theme | null;
    const initial: Theme =
      stored === "light" || stored === "dark" || stored === "system"
        ? stored
        : "system";
    setThemeState(initial);
    setResolved(apply(initial));
  }, []);

  // Follow the OS in real time, but only while the user is on "system".
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setResolved(apply("system"));
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
    setResolved(apply(next));
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, resolved, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}

/**
 * Runs before first paint to set the `dark` class from localStorage,
 * preventing a light flash on load for dark-theme users. Injected as an
 * inline script because React hydration happens too late for this.
 */
export const themeInitScript = `
(function(){try{
  var t = localStorage.getItem('${STORAGE_KEY}');
  var dark = t === 'dark' || ((!t || t === 'system') &&
    window.matchMedia('(prefers-color-scheme: dark)').matches);
  if (dark) document.documentElement.classList.add('dark');
}catch(e){}})();
`;
