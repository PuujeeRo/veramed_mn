// "/dashboard/products/{productId}" — one product's full editor. The
// Products section's table links here.
//
// Server Component: fetches the company, this one product, the quizzes it
// can be put in and who is signed in; notFound() if the product doesn't
// exist or was deleted. Gated by middleware.ts, which covers everything
// under /dashboard.
//
// Uses getProductForDashboard, not the public getProduct — a manager needs
// to reach a hidden product to publish it.

import { notFound } from "next/navigation";
import { getCompany, getProductForDashboard, getProductsForDashboard, getQuizzes } from "@/lib/data";
import { getSessionProfile } from "@/lib/auth";
import DashboardShell from "@/components/DashboardShell";
import ProductEditor from "@/components/ProductEditor";

export const dynamic = "force-dynamic";

export default async function ProductDetailPage({
  params,
}: {
  params: { productId: string };
}) {
  const [brand, product, all, quizzes, profile] = await Promise.all([
    getCompany(),
    getProductForDashboard(params.productId),
    getProductsForDashboard(),
    getQuizzes(),
    getSessionProfile(),
  ]);
  if (!product) notFound();

  return (
    <DashboardShell
      brand={brand}
      active="products"
      productCount={all.length}
      user={profile ? { name: profile.fullName, email: profile.email } : null}
    >
      {/* Keyed so navigating between products starts each with a fresh form. */}
      <ProductEditor key={product.id} product={product} quizzes={quizzes} />
    </DashboardShell>
  );
}
