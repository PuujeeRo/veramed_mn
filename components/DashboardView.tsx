"use client";

// Client half of /dashboard. The Server Component in
// app/[locale]/dashboard/page.tsx fetches the company, products and
// quizzes; this picks the active section and renders it. Each section
// renders its own PageHeader (its actions depend on its own state).
//
// The URL is the source of truth for the section — `?tab=` instead of
// useState, so a reload, a shared link, or back/forward land on the same
// place. Missing or unknown → Overview. On the Quiz tab, `&quiz={id}`
// opens that quiz's editor; without it the tab lists the quizzes.

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Brand, Product, Quiz } from "@/lib/types";
import DashboardShell, { DASH_TABS, ShellUser } from "@/components/DashboardShell";
import OverviewPanel from "@/components/OverviewPanel";
import ProductsPanel from "@/components/ProductsPanel";
import CategoriesEditor from "@/components/CategoriesEditor";
import QuizzesPanel from "@/components/QuizzesPanel";
import QuizEditor from "@/components/QuizEditor";
import SiteContentEditor from "@/components/SiteContentEditor";
import StatsPanel from "@/components/StatsPanel";

interface DashboardViewProps {
  brand: Brand;
  products: Product[];
  quizzes: Quiz[];
  user: ShellUser | null;
}

export default function DashboardView({ brand, products, quizzes, user }: DashboardViewProps) {
  const searchParams = useSearchParams();
  const tab = DASH_TABS.find((entry) => entry.key === searchParams.get("tab"))?.key ?? "overview";

  // Seeded from props, then appended to locally when a product is created
  // (the editor it opens is a separate page that re-fetches anyway).
  const [productList, setProductList] = useState(products);
  // Seeded from props and kept current as quizzes are created, saved and
  // deleted, so moving between the list and an editor never shows stale
  // data without a reload.
  const [quizList, setQuizList] = useState(quizzes);
  const openQuiz = tab === "quiz" ? quizList.find((q) => q.id === searchParams.get("quiz")) : undefined;
  const allQuestions = quizList.flatMap((q) => q.questions);

  const replaceQuiz = (saved: Quiz) => setQuizList((list) => list.map((q) => (q.id === saved.id ? saved : q)));

  return (
    <DashboardShell brand={brand} active={tab} user={user} productCount={productList.length}>
      {tab === "overview" && <OverviewPanel brand={brand} products={productList} quizzes={quizList} user={user} />}
      {tab === "products" && (
        <ProductsPanel
          products={productList}
          quizzes={quizList}
          onCreated={(p) => setProductList((list) => [...list, p])}
        />
      )}
      {tab === "categories" && <CategoriesEditor products={productList} questions={allQuestions} />}
      {tab === "quiz" &&
        (openQuiz ? (
          // Keyed so switching quizzes starts each editor from its own save.
          <QuizEditor
            key={openQuiz.id}
            quiz={openQuiz}
            isMain={openQuiz.id === quizList.find((q) => q.status === "active")?.id}
            products={productList}
            onSaved={replaceQuiz}
            onDeleted={(id) => setQuizList((list) => list.filter((q) => q.id !== id))}
            onMadeMain={(saved) => setQuizList((list) => [saved, ...list.filter((q) => q.id !== saved.id)])}
          />
        ) : (
          <QuizzesPanel
            brand={brand}
            quizzes={quizList}
            products={productList}
            onCreated={(quiz) => setQuizList((list) => [...list, quiz])}
            onChanged={replaceQuiz}
            onMadeMain={(saved) => setQuizList((list) => [saved, ...list.filter((q) => q.id !== saved.id)])}
            onDeleted={(id) => setQuizList((list) => list.filter((q) => q.id !== id))}
          />
        ))}
      {tab === "site" && <SiteContentEditor brand={brand} />}
      {tab === "stats" && <StatsPanel brand={brand} products={productList} quizzes={quizList} />}
    </DashboardShell>
  );
}
