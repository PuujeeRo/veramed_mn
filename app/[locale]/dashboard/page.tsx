// "/dashboard" — the manager's dashboard.
//
// Server Component: fetches the company, every non-deleted product (hidden
// ones included — the manager needs to see and publish those), the quiz
// questions and who is signed in. Client half (sections, editors) lives in
// components/DashboardView.tsx.
//
// Gated by middleware.ts — signed in as the company's manager, or as admin.
// Every write route re-checks ownership itself too (lib/auth.ts).

import { getCompany, getProductsForDashboard, getQuizQuestions } from "@/lib/data";
import { getSessionProfile } from "@/lib/auth";
import DashboardView from "@/components/DashboardView";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [brand, products, questions, profile] = await Promise.all([
    getCompany(),
    getProductsForDashboard(),
    getQuizQuestions(),
    getSessionProfile(),
  ]);

  return (
    <DashboardView
      brand={brand}
      products={products}
      questions={questions}
      user={profile ? { name: profile.fullName, email: profile.email } : null}
    />
  );
}
