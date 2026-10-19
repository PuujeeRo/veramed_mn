// "/p/{productId}" — one product's own page. This is the link the
// dashboard hands out (copy link / QR code), so the path must stay stable.
//
// Server Component: fetches the product and handles the notFound() guard
// (a hidden or deleted product 404s for visitors). Client half (templates,
// view tracking) lives in components/ProductPageView.tsx.

import { notFound } from "next/navigation";
import { getProduct, getProducts, getPublishedQuizzes } from "@/lib/data";
import { isQuizReady } from "@/lib/scoring";
import ProductPageView from "@/components/ProductPageView";

export const dynamic = "force-dynamic";

export default async function ProductPage({
  params,
}: {
  params: { productId: string };
}) {
  const product = await getProduct(params.productId);
  if (!product) notFound();

  const productId = product.id;
  const [all, quizzes] = await Promise.all([getProducts(), getPublishedQuizzes()]);
  const others = all.filter((p) => p.id !== productId);

  // The quiz card points at a quiz that can actually recommend this
  // product — the main one when it can, otherwise the first that does.
  const quiz = quizzes.find((q) => q.productIds.includes(productId) && isQuizReady(q, all));
  const quizHref = !quiz ? null : quiz.id === quizzes[0].id ? "/quiz" : `/quiz/${quiz.slug}`;

  return <ProductPageView product={product} others={others} quizHref={quizHref} />;
}
