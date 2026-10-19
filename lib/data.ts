// veramed — the company, its products and its quizzes, read from Supabase
// Postgres through the anon client (public-read RLS).
//
// While Supabase isn't configured (lib/company.ts's isSupabaseConfigured()),
// every read here returns supabase/seed.json's sample content instead, so
// the public site renders before a database exists. That is a whole-source
// switch, never a merge: once keys are set, a read is always the latest
// save and the seed file is not consulted again.

import { supabase } from "./supabase";
import { COMPANY_ID, isSupabaseConfigured } from "./company";
import { Brand, CompanyContact, PageTemplate, Product, Quiz, QuizQuestion } from "./types";
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

function seedQuizzes(): Quiz[] {
  return seed.quizzes.map((quiz, i) => ({
    id: quiz.id,
    brandId: COMPANY_ID,
    slug: quiz.slug,
    title_mn: quiz.title_mn,
    title_en: quiz.title_en,
    status: "active",
    order: i,
    productIds: quiz.product_ids,
    questions: seed.questions
      .filter((q) => q.quiz_id === quiz.id)
      .map((q, qi) => ({
        id: q.id,
        brandId: COMPANY_ID,
        quizId: quiz.id,
        order: qi + 1,
        text_mn: q.text_mn,
        text_en: q.text_en,
        answers: q.answers.map((a, ai) => ({ id: `${q.id}-a${ai + 1}`, ...a })),
      })),
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
  quiz_id: string;
  text_mn: string;
  text_en: string | null;
  order: number;
  quiz_answers: QuizAnswerRow[];
}

interface QuizRow {
  id: string;
  brand_id: string;
  slug: string;
  title_mn: string;
  title_en: string | null;
  status: "active" | "inactive";
  order: number;
  quiz_products: { product_id: string }[];
  quiz_questions: QuizQuestionRow[];
}

function toQuizQuestion(row: QuizQuestionRow): QuizQuestion {
  return {
    id: row.id,
    brandId: row.brand_id,
    quizId: row.quiz_id,
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
  };
}

function toQuiz(row: QuizRow): Quiz {
  return {
    id: row.id,
    brandId: row.brand_id,
    slug: row.slug,
    title_mn: row.title_mn,
    title_en: row.title_en ?? undefined,
    status: row.status,
    order: row.order,
    productIds: row.quiz_products.map((p) => p.product_id),
    questions: [...row.quiz_questions].sort((a, b) => a.order - b.order).map(toQuizQuestion),
  };
}

/** Columns for one quiz with its products and questions nested via the FK
 *  joins. Shared with the quiz routes so a save returns what a read does. */
export const QUIZ_SELECT =
  "id, brand_id, slug, title_mn, title_en, status, order, quiz_products(product_id), " +
  "quiz_questions(id, brand_id, quiz_id, text_mn, text_en, order, quiz_answers(id, text_mn, text_en, category, points, order))";

export function rowToQuiz(row: unknown): Quiz {
  return toQuiz(row as QuizRow);
}

/** Every quiz, hidden ones included — for the dashboard. Main first. */
export async function getQuizzes(): Promise<Quiz[]> {
  if (!isSupabaseConfigured()) return seedQuizzes();
  const { data, error } = await supabase
    .from("quizzes")
    .select(QUIZ_SELECT)
    .eq("brand_id", COMPANY_ID)
    .order("order")
    .order("created_at");
  if (error) throw error;
  return (data as unknown as QuizRow[]).map(toQuiz);
}

/** What visitors can open: published quizzes only, main first. */
export async function getPublishedQuizzes(): Promise<Quiz[]> {
  return (await getQuizzes()).filter((q) => q.status === "active");
}

/** One published quiz by its slug, or the main one when no slug is given.
 *  Undefined when there is no such quiz (or none is published). */
export async function getQuiz(slug?: string): Promise<Quiz | undefined> {
  const published = await getPublishedQuizzes();
  return slug === undefined ? published[0] : published.find((q) => q.slug === slug);
}
