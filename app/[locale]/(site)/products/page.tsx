// "/products" — the full catalog. Client half: components/ProductsView.tsx.

import { getProducts, getQuizQuestions } from "@/lib/data";
import { getCategories } from "@/lib/categories";
import { filterQuizEligible } from "@/lib/scoring";
import ProductsView from "@/components/ProductsView";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const [products, categories, questions] = await Promise.all([
    getProducts(),
    getCategories(),
    getQuizQuestions(),
  ]);
  const hasQuiz = questions.length > 0 && filterQuizEligible(products).length > 0;

  return <ProductsView products={products} categories={categories} hasQuiz={hasQuiz} />;
}
