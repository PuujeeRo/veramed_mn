// "/" — the company's home page.
//
// Server Component: fetches the company, its products, the main quiz (the
// one /quiz opens) and categories. The client half lives in
// components/HomeView.tsx.

import { getCompany, getProducts, getQuiz } from "@/lib/data";
import { getCategories } from "@/lib/categories";
import HomeView from "@/components/HomeView";

// Always the latest save — a manager's edit must show on the next load,
// not after a rebuild.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [brand, products, quiz, categories] = await Promise.all([
    getCompany(),
    getProducts(),
    getQuiz(),
    getCategories(),
  ]);

  return <HomeView brand={brand} products={products} quiz={quiz ?? null} categories={categories} />;
}
