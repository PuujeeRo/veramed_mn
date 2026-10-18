// veramed — product page template registry.
//
// A template is a React component composed from the shared blocks in
// components/product-blocks/ — never bespoke markup. Registering a fourth
// template means: write the composition, add it to TEMPLATES below, add its
// display name to both locale files. Nothing else should need to change —
// if it does, this registry is broken (see CLAUDE.md #10).
//
// Not pure like lib/scoring.ts (it imports React components), but it is the
// single place that maps a template id to what actually renders.

import { ComponentType } from "react";
import { Product, PageTemplate } from "./types";
import ShowcaseTemplate from "@/components/product-templates/ShowcaseTemplate";
import ClassicTemplate from "@/components/product-templates/ClassicTemplate";
import GalleryFirstTemplate from "@/components/product-templates/GalleryFirstTemplate";
import MinimalTemplate from "@/components/product-templates/MinimalTemplate";

export const DEFAULT_TEMPLATE: PageTemplate = "showcase";

interface TemplateDef {
  id: PageTemplate;
  /** Locale key for the picker label — see locales/{mn,en}.json. */
  nameKey: string;
  Component: ComponentType<{ product: Product }>;
}

export const TEMPLATES: TemplateDef[] = [
  { id: "showcase", nameKey: "template.showcase", Component: ShowcaseTemplate },
  { id: "classic", nameKey: "template.classic", Component: ClassicTemplate },
  { id: "gallery-first", nameKey: "template.galleryFirst", Component: GalleryFirstTemplate },
  { id: "minimal", nameKey: "template.minimal", Component: MinimalTemplate },
];

/** Falls back to Classic when no template has been chosen yet. */
export function resolveTemplate(product: Product): PageTemplate {
  return product.pageTemplate ?? DEFAULT_TEMPLATE;
}

export function getTemplateComponent(id: PageTemplate): ComponentType<{ product: Product }> {
  return TEMPLATES.find((t) => t.id === id)?.Component ?? ShowcaseTemplate;
}
