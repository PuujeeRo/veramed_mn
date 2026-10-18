"use client";

// Client half of /dashboard. The Server Component in
// app/[locale]/dashboard/page.tsx fetches the company, products and quiz
// questions; this picks the active section and renders it. Each section
// renders its own PageHeader (its actions depend on its own state).
//
// The URL is the source of truth for the section — `?tab=` instead of
// useState, so a reload, a shared link, or back/forward land on the same
// place. Missing or unknown → Overview.

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Brand, Product, QuizQuestion } from "@/lib/types";
import DashboardShell, { DASH_TABS, ShellUser } from "@/components/DashboardShell";
import OverviewPanel from "@/components/OverviewPanel";
import ProductsPanel from "@/components/ProductsPanel";
import CategoriesEditor from "@/components/CategoriesEditor";
import QuizEditor from "@/components/QuizEditor";
import SiteContentEditor from "@/components/SiteContentEditor";
import StatsPanel from "@/components/StatsPanel";

interface DashboardViewProps {
  brand: Brand;
  products: Product[];
  questions: QuizQuestion[];
  user: ShellUser | null;
}

export default function DashboardView({ brand, products, questions, user }: DashboardViewProps) {
  const searchParams = useSearchParams();
  const tab = DASH_TABS.find((entry) => entry.key === searchParams.get("tab"))?.key ?? "overview";

  // Seeded from props, then appended to locally when a product is created
  // (the editor it opens is a separate page that re-fetches anyway).
  const [productList, setProductList] = useState(products);

  return (
    <DashboardShell brand={brand} active={tab} user={user} productCount={productList.length}>
      {tab === "overview" && <OverviewPanel brand={brand} products={productList} questions={questions} user={user} />}
      {tab === "products" && (
        <ProductsPanel products={productList} onCreated={(p) => setProductList((list) => [...list, p])} />
      )}
      {tab === "categories" && <CategoriesEditor products={productList} questions={questions} />}
      {tab === "quiz" && <QuizEditor brand={brand} baseQuestions={questions} products={productList} />}
      {tab === "site" && <SiteContentEditor brand={brand} />}
      {tab === "stats" && <StatsPanel brand={brand} products={productList} />}
    </DashboardShell>
  );
}
