// "/quiz" — the main quiz: the first published one (see lib/data.ts
// getQuiz). Every quiz also has its own link, /quiz/{slug}. Visitors are
// anonymous; no account, nothing asked of them but the answers.

import { getCompany, getProducts, getQuiz } from "@/lib/data";
import { getCategories } from "@/lib/categories";
import QuizFlow from "@/components/QuizFlow";

export const dynamic = "force-dynamic";

export default async function QuizPage() {
  const [brand, quiz, products, categories] = await Promise.all([
    getCompany(),
    getQuiz(),
    getProducts(),
    getCategories(),
  ]);

  return <QuizFlow brand={brand} quiz={quiz ?? null} products={products} categories={categories} />;
}
