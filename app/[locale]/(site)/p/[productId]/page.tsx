// "/p/{productId}" — one product's own page. This is the link the
// dashboard hands out (copy link / QR code), so the path must stay stable.
//
// Server Component: fetches the product and handles the notFound() guard
// (a hidden or deleted product 404s for visitors). Client half (templates,
// view tracking) lives in components/ProductPageView.tsx.

import { notFound } from "next/navigation";
import { getProduct, getProducts, getQuizQuestions } from "@/lib/data";
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
  const [all, questions] = await Promise.all([getProducts(), getQuizQuestions()]);
  const others = all.filter((p) => p.id !== productId);

  return <ProductPageView product={product} others={others} hasQuiz={questions.length > 0} />;
}
