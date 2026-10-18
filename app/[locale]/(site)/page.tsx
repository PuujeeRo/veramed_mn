// "/" — the company's home page.
//
// Server Component: fetches the company, its products, its quiz questions
// and categories. The client half lives in components/HomeView.tsx.

import { getCompany, getProducts, getQuizQuestions } from "@/lib/data";
import { getCategories } from "@/lib/categories";
import HomeView from "@/components/HomeView";

// Always the latest save — a manager's edit must show on the next load,
// not after a rebuild.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [brand, products, questions, categories] = await Promise.all([
    getCompany(),
    getProducts(),
    getQuizQuestions(),
    getCategories(),
  ]);

  return <HomeView brand={brand} products={products} questions={questions} categories={categories} />;
}
