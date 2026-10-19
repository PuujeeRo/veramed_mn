// veramed — the company, its products and its quiz questions, read from
// Supabase Postgres through the anon client (public-read RLS).
//
// While Supabase isn't configured (lib/company.ts's isSupabaseConfigured()),
// every read here returns supabase/seed.json's sample content instead, so
// the public site renders before a database exists. That is a whole-source
// switch, never a merge: once keys are set, a read is always the latest
// save and the seed file is not consulted again.

import { supabase } from "./supabase";
import { COMPANY_ID, isSupabaseConfigured } from "./company";
import { Brand, CompanyContact, PageTemplate, Product, QuizQuestion } from "./types";
import type { ProductAccent } from "./accents";
import seed from "@/supabase/seed.json";

interface BrandRow {
  id: string;
  slug: string;
  name: string;
  logo_url: string;
  quiz_intro_mn: string;
  quiz_intro_en: string | null;
  about_mn: string | null;
  about_en: string | null;
  contact: CompanyContact | null;
}

/** Exported for ProductCreateForm, which gets a raw row back from the
 *  create route and needs the same mapping. */
export interface ProductRow {
  id: string;
  brand_id: string;
  name_mn: string;
  name_en: string | null;
  description_mn: string;
  description_en: string | null;
  price: number;
  image_url: string;
  gallery_urls: string[] | null;
  video_url: string | null;
  page_template: PageTemplate | null;
  accent: ProductAccent | null;
  categories: string[];
  include_in_quiz: boolean;
  buy_now_url: string | null;
  boost_score: number;
  status: "active" | "inactive" | "deleted";
  social: { facebook?: string; instagram?: string } | null;
  contact: { phone?: string; whatsapp?: string } | null;
}

function toBrand(row: BrandRow): Brand {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    logoUrl: row.logo_url,
    quizIntro_mn: row.quiz_intro_mn,
    quizIntro_en: row.quiz_intro_en ?? undefined,
    about_mn: row.about_mn ?? undefined,
    about_en: row.about_en ?? undefined,
    contact: row.contact ?? undefined,
  };
}

export function toProduct(row: ProductRow): Product {
  return {
    id: row.id,
    brandId: row.brand_id,
    name_mn: row.name_mn,
    name_en: row.name_en ?? undefined,
    description_mn: row.description_mn,
    description_en: row.description_en ?? undefined,
    price: row.price,
    imageUrl: row.image_url,
    galleryUrls: row.gallery_urls ?? undefined,
    videoUrl: row.video_url ?? undefined,
    pageTemplate: row.page_template ?? undefined,
    accent: row.accent ?? undefined,
    categories: row.categories,
    includeInQuiz: row.include_in_quiz,
    buyNowUrl: row.buy_now_url ?? undefined,
    boostScore: row.boost_score,
    status: row.status,
    social: row.social ?? undefined,
    contact: row.contact ?? undefined,
  };
}

// ---- Sample content (no database yet) ----

function seedCompany(): Brand {
  return toBrand(seed.company as BrandRow);
}

function seedProducts(): Product[] {
  return seed.products.map((p) =>
    toProduct({
      ...p,
      brand_id: COMPANY_ID,
      video_url: null,
      status: "active",
      social: null,
      contact: null,
    } as ProductRow)
  );
}

function seedQuestions(): QuizQuestion[] {
  return seed.questions.map((q, qi) => ({
    id: q.id,
    brandId: COMPANY_ID,
    order: qi + 1,
    text_mn: q.text_mn,
    text_en: q.text_en,
    answers: q.answers.map((a, ai) => ({ id: `${q.id}-a${ai + 1}`, ...a })),
  }));
}

// ---- Lookups ----

/** The company row. Throws if it's missing — that means the database was
 *  never seeded (scripts/seed-supabase.mjs), which no page can render
 *  around. */
export async function getCompany(): Promise<Brand> {
  if (!isSupabaseConfigured()) return seedCompany();
  const { data, error } = await supabase.from("brands").select("*").eq("id", COMPANY_ID).maybeSingle();
  if (error) throw error;
  if (!data) {
    throw new Error(
      `Company row not found (looked for id ${JSON.stringify(COMPANY_ID)}) — run \`node scripts/seed-supabase.mjs\` against this database.`
    );
  }
  return toBrand(data as BrandRow);
}

/** What visitors see: active products only, oldest first. */
export async function getProducts(): Promise<Product[]> {
  if (!isSupabaseConfigured()) return seedProducts();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("brand_id", COMPANY_ID)
    .eq("status", "active")
    .order("created_at");
  if (error) throw error;
  return (data as ProductRow[]).map(toProduct);
}

/** Like getProducts, but also includes hidden ("inactive") products — the
 *  manager needs to see and re-publish those. */
export async function getProductsForDashboard(): Promise<Product[]> {
  if (!isSupabaseConfigured()) return seedProducts();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("brand_id", COMPANY_ID)
    .neq("status", "deleted")
    .order("created_at");
  if (error) throw error;
  return (data as ProductRow[]).map(toProduct);
}

export async function getProduct(productId: string): Promise<Product | undefined> {
  if (!isSupabaseConfigured()) return seedProducts().find((p) => p.id === productId);
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("brand_id", COMPANY_ID)
    .eq("id", productId)
    .eq("status", "active")
    .maybeSingle();
  if (error) throw error;
  return data ? toProduct(data as ProductRow) : undefined;
}

/** Like getProduct, but also reachable while hidden — for the dashboard's
 *  product edit page. */
export async function getProductForDashboard(productId: string): Promise<Product | undefined> {
  if (!isSupabaseConfigured()) return seedProducts().find((p) => p.id === productId);
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("brand_id", COMPANY_ID)
    .eq("id", productId)
    .neq("status", "deleted")
    .maybeSingle();
  if (error) throw error;
  return data ? toProduct(data as ProductRow) : undefined;
}

interface QuizAnswerRow {
  id: string;
  text_mn: string;
  text_en: string | null;
  category: string;
  points: number;
  order: number;
}

interface QuizQuestionRow {
  id: string;
  brand_id: string;
  text_mn: string;
  text_en: string | null;
  order: number;
  quiz_answers: QuizAnswerRow[];
}

/** Public read — a visitor takes the quiz with no auth. Answers come back
 *  nested via the FK join; both levels are sorted by "order" here so
 *  callers never need to re-sort. */
export async function getQuizQuestions(): Promise<QuizQuestion[]> {
  if (!isSupabaseConfigured()) return seedQuestions();
  const { data, error } = await supabase
    .from("quiz_questions")
    .select("id, brand_id, text_mn, text_en, order, quiz_answers(id, text_mn, text_en, category, points, order)")
    .eq("brand_id", COMPANY_ID)
    .order("order");
  if (error) throw error;
  return (data as unknown as QuizQuestionRow[]).map((row) => ({
    id: row.id,
    brandId: row.brand_id,
    order: row.order,
    text_mn: row.text_mn,
    text_en: row.text_en ?? "",
    answers: [...row.quiz_answers]
      .sort((a, b) => a.order - b.order)
      .map((a) => ({
        id: a.id,
        text_mn: a.text_mn,
        text_en: a.text_en ?? "",
        category: a.category,
        points: a.points,
      })),
  }));
}
