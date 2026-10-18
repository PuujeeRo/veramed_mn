// veramed — per-product colour themes. A product picks one; its page hero
// and its catalog tile are tinted with it (the colour-blocked look of the
// design concept: each product owns a colour).
//
// The palettes themselves are CSS (app/globals.css, `.accent-*`), so they
// can also re-point the theme tokens for content placed on top of them —
// this file only lists the ids and their display names. Kept in sync with
// the `products.accent` check constraint in supabase/schema.sql.

export type ProductAccent = "crimson" | "sunset" | "sun" | "sky" | "sage";

export const ACCENTS: { id: ProductAccent; nameKey: string }[] = [
  { id: "crimson", nameKey: "accent.crimson" },
  { id: "sunset", nameKey: "accent.sunset" },
  { id: "sun", nameKey: "accent.sun" },
  { id: "sky", nameKey: "accent.sky" },
  { id: "sage", nameKey: "accent.sage" },
];

export const DEFAULT_ACCENT: ProductAccent = "crimson";

export function accentClass(accent: ProductAccent | undefined): string {
  return `accent-${accent ?? DEFAULT_ACCENT}`;
}
