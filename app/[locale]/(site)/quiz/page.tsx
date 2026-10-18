// "/quiz" — the product-recommendation quiz. Visitors are anonymous; no
// account, nothing asked of them but the answers.

import { getCompany, getProducts, getQuizQuestions } from "@/lib/data";
import { getCategories } from "@/lib/categories";
import QuizFlow from "@/components/QuizFlow";

export const dynamic = "force-dynamic";

export default async function QuizPage() {
  const [brand, questions, products, categories] = await Promise.all([
    getCompany(),
    getQuizQuestions(),
    getProducts(),
    getCategories(),
  ]);

  return <QuizFlow brand={brand} questions={questions} products={products} categories={categories} />;
}
