// "/quiz/{slug}" — one particular quiz, the link the dashboard copies and
// prints as a QR code for it. A hidden or unknown quiz is a 404, the same
// as a hidden product.

import { notFound } from "next/navigation";
import { getCompany, getProducts, getQuiz } from "@/lib/data";
import { getCategories } from "@/lib/categories";
import QuizFlow from "@/components/QuizFlow";

export const dynamic = "force-dynamic";

export default async function QuizBySlugPage({ params }: { params: { slug: string } }) {
  const [brand, quiz, products, categories] = await Promise.all([
    getCompany(),
    getQuiz(params.slug),
    getProducts(),
    getCategories(),
  ]);
  if (!quiz) notFound();

  return <QuizFlow brand={brand} quiz={quiz} products={products} categories={categories} />;
}
