// veramed — shared types. Shapes match supabase/schema.sql.

// `Locale` lives in lib/i18n.tsx, next to the dictionaries that define it.

import type { ProductAccent } from "./accents";

/** Product page layouts. Registered in lib/templates.ts. */
export type PageTemplate = "showcase" | "classic" | "gallery-first" | "minimal";

export interface Category {
  id: string;
  slug: string;
  name_mn: string;
  name_en: string;
}

/** One of the company's quizzes. Visitors open it at /quiz/{slug}; /quiz
 *  shows the main one (the first published by `order`). It recommends only
 *  from its own products. */
export interface Quiz {
  id: string;
  brandId: string;
  slug: string;
  /** The headline on the quiz's intro screen. */
  title_mn: string;
  title_en?: string;
  status: "active" | "inactive";
  order: number;
  productIds: string[];
  questions: QuizQuestion[];
}

export interface QuizQuestion {
  id: string;
  brandId: string;
  quizId: string;
  order: number;
  text_mn: string;
  text_en: string;
  answers: QuizAnswer[];
}

export interface QuizAnswer {
  id: string;
  text_mn: string;
  text_en: string;
  /** Category slug this answer adds points to. */
  category: string;
  points: number;
}

export interface Product {
  id: string;
  brandId: string;
  name_mn: string;
  name_en?: string;
  /** HTML from the Lexical editor, sanitized server-side on save. */
  description_mn: string;
  description_en?: string;
  price: number; // ₮
  imageUrl: string;
  galleryUrls?: string[];
  videoUrl?: string;
  /** Undefined falls back to the default — see lib/templates.ts. */
  pageTemplate?: PageTemplate;
  /** Colour theme for the page hero and catalog tile — lib/accents.ts. */
  accent?: ProductAccent;
  /** Category slugs this product helps with — what the quiz matches on.
   *  Which quizzes may suggest it is Quiz.productIds, not a field here. */
  categories: string[];
  /** Where "order" sends the visitor: the company's store, Messenger, etc. */
  buyNowUrl?: string;
  /** Tie-break order among products the quiz already matched (0–100). */
  boostScore: number;
  /** "inactive" = hidden from visitors, still editable in the dashboard.
   *  "deleted" = removed (soft delete, so its stats rows stay attributable). */
  status: "active" | "inactive" | "deleted";
  social?: { facebook?: string; instagram?: string };
  contact?: { phone?: string; whatsapp?: string };
}

export interface CompanyContact {
  phone?: string;
  email?: string;
  address?: string;
  facebook?: string;
  instagram?: string;
}

/** The company. Named `Brand` (and stored in `brands`) for continuity with
 *  the data model this was cloned from — there is only ever one. See
 *  lib/company.ts. */
export interface Brand {
  id: string;
  slug: string;
  name: string;
  logoUrl: string;
  /** One-line tagline: the home page headline. Each quiz has its own
   *  title for its intro (Quiz.title_mn). */
  quizIntro_mn: string;
  quizIntro_en?: string; // optional, falls back to MN
  /** About copy, HTML from the Lexical editor. */
  about_mn?: string;
  about_en?: string;
  contact?: CompanyContact;
}

export interface QuizAnswerState {
  questionId: string;
  answerId: string;
}

export interface QuizResult {
  product: Product;
  matchedCategory: string;
  score: number;
}
