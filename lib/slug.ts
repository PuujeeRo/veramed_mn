// Slug helper for category codes — lets a manager type a Mongolian category
// name and get a usable ASCII code derived from it.

/** Mongolian Cyrillic → Latin. */
const TRANSLITERATE: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "j",
  з: "z", и: "i", й: "i", к: "k", л: "l", м: "m", н: "n", о: "o",
  ө: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ү: "u", ф: "f",
  х: "kh", ц: "ts", ч: "ch", ш: "sh", щ: "sh", ъ: "", ы: "y", ь: "",
  э: "e", ю: "yu", я: "ya",
};

/** Turn any name (Cyrillic or Latin) into a lowercase, hyphenated code. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .split("")
    .map((ch) => (ch in TRANSLITERATE ? TRANSLITERATE[ch] : ch))
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}
