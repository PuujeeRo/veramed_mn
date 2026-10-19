// "/products" — the full catalog. Client half: components/ProductsView.tsx.

import { getProducts, getQuiz } from "@/lib/data";
import { getCategories } from "@/lib/categories";
import { isQuizReady } from "@/lib/scoring";
import ProductsView from "@/components/ProductsView";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const [products, categories, quiz] = await Promise.all([getProducts(), getCategories(), getQuiz()]);
  // The catalog's quiz card links to /quiz, the main quiz.
  const hasQuiz = isQuizReady(quiz, products);

  return <ProductsView products={products} categories={categories} hasQuiz={hasQuiz} />;
}
