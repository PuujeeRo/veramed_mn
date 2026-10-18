// veramed — locale-aware navigation primitives. Every
// internal Link/router.push must go through these instead of next/link
// and next/navigation directly — otherwise a link built from a raw path
// (e.g. `/${brand.slug}`) silently drops the current locale and bounces
// an English visitor back to MN. Drop-in replacements: same API shape.
import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

export const { Link, useRouter, usePathname, redirect } = createNavigation(routing);
