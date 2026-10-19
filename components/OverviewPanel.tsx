"use client";

// The dashboard's front page: where the catalog stands at a glance, and —
// the part that earns this screen — a checklist of things that quietly
// break the site for visitors (a product the quiz can never recommend, a
// quiz answer that leads nowhere, an Order button with nowhere to go).
// Everything is computed from data the page already has; no extra request.

import { ReactNode } from "react";
import { IconType } from "react-icons";
import {
  FiAlertTriangle,
  FiArrowRight,
  FiBox,
  FiCheckCircle,
  FiEyeOff,
  FiHelpCircle,
  FiLink2,
  FiPhone,
  FiPlus,
  FiTag,
  FiFileText,
} from "react-icons/fi";
import { Link } from "@/lib/navigation";
import { localized, useLanguage } from "@/lib/i18n";
import { isQuizReady, quizPool } from "@/lib/scoring";
import { Brand, Product, Quiz } from "@/lib/types";
import PageHeader from "./ui/PageHeader";
import Section from "./ui/Section";
import ShareLinkRow from "./ShareLinkRow";
import { ShellUser } from "./DashboardShell";

interface OverviewPanelProps {
  brand: Brand;
  products: Product[];
  quizzes: Quiz[];
  user: ShellUser | null;
}

interface Issue {
  key: string;
  icon: IconType;
  tone: "warning" | "info";
  title: string;
  body: string;
  href: string;
  action: string;
}

export default function OverviewPanel({ brand, products, quizzes, user }: OverviewPanelProps) {
  const { locale, t } = useLanguage();

  const published = products.filter((p) => p.status === "active");
  const hidden = products.filter((p) => p.status === "inactive");
  const noOrderLink = published.filter((p) => !p.buyNowUrl);

  const publishedQuizzes = quizzes.filter((q) => q.status === "active");
  const liveQuizzes = publishedQuizzes.filter((q) => isQuizReady(q, products));
  // Published products a live quiz can actually land on.
  const recommendable = published.filter(
    (p) => p.categories.length > 0 && liveQuizzes.some((q) => q.productIds.includes(p.id))
  );
  const inQuizNoCategory = published.filter(
    (p) => p.categories.length === 0 && quizzes.some((q) => q.productIds.includes(p.id))
  );

  // Answers in a published quiz that add points to a category none of that
  // quiz's own published products carries: a visitor who picks them gets
  // "no match".
  const deadAnswers = publishedQuizzes.flatMap((quiz) => {
    const covered = new Set(quizPool(quiz, products).flatMap((p) => p.categories));
    return quiz.questions.flatMap((q) =>
      q.answers.filter((a) => a.points > 0 && !covered.has(a.category)).map((a) => ({ quiz, a }))
    );
  });

  const c = brand.contact ?? {};
  const hasContact = Boolean(c.phone || c.email || c.facebook || c.instagram);

  const names = (list: Product[]) =>
    list
      .slice(0, 3)
      .map((p) => localized(locale, p.name_mn, p.name_en))
      .join(", ") + (list.length > 3 ? ` +${list.length - 3}` : "");

  const issues: Issue[] = [];
  if (liveQuizzes.length === 0) {
    issues.push({ key: "no-quiz", icon: FiHelpCircle, tone: "warning", title: t("overview.noQuizTitle"), body: t("overview.noQuizBody"), href: "/dashboard?tab=quiz", action: t("overview.openQuiz") });
  }
  if (inQuizNoCategory.length > 0) {
    issues.push({ key: "no-cat", icon: FiTag, tone: "warning", title: t("overview.noCategoryTitle", { n: inQuizNoCategory.length }), body: names(inQuizNoCategory), href: "/dashboard?tab=products", action: t("overview.fixProducts") });
  }
  if (deadAnswers.length > 0) {
    issues.push({
      key: "dead-answers",
      icon: FiAlertTriangle,
      tone: "warning",
      title: t("overview.deadAnswersTitle", { n: deadAnswers.length }),
      body: deadAnswers
        .slice(0, 3)
        .map(({ a }) => `“${localized(locale, a.text_mn, a.text_en)}”`)
        .join(", "),
      href: `/dashboard?tab=quiz&quiz=${deadAnswers[0].quiz.id}`,
      action: t("overview.openQuiz"),
    });
  }
  if (noOrderLink.length > 0) {
    issues.push({ key: "no-order", icon: FiLink2, tone: "warning", title: t("overview.noOrderTitle", { n: noOrderLink.length }), body: names(noOrderLink), href: "/dashboard?tab=products", action: t("overview.fixProducts") });
  }
  if (hidden.length > 0) {
    issues.push({ key: "hidden", icon: FiEyeOff, tone: "info", title: t("overview.hiddenTitle", { n: hidden.length }), body: names(hidden), href: "/dashboard?tab=products&status=inactive", action: t("overview.review") });
  }
  if (!hasContact) {
    issues.push({ key: "contact", icon: FiPhone, tone: "warning", title: t("overview.noContactTitle"), body: t("overview.noContactBody"), href: "/dashboard?tab=site", action: t("overview.openSite") });
  }
  if (!brand.about_mn) {
    issues.push({ key: "about", icon: FiFileText, tone: "info", title: t("overview.noAboutTitle"), body: t("overview.noAboutBody"), href: "/dashboard?tab=site", action: t("overview.openSite") });
  }

  const firstName = user?.name?.split(" ")[0];

  return (
    <>
      <PageHeader
        title={firstName ? t("overview.greetingNamed", { name: firstName }) : t("overview.greeting")}
        description={t("overview.description")}
        actions={
          <Link href="/dashboard?tab=products&new=1" className="btn-primary">
            <FiPlus size={16} /> {t("dash.addProduct")}
          </Link>
        }
      />

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label={t("overview.kpiPublished")} value={published.length} sub={t("overview.kpiOf", { n: products.length })} href="/dashboard?tab=products&status=active" />
        <Kpi label={t("overview.kpiHidden")} value={hidden.length} sub={t("overview.kpiHiddenSub")} href="/dashboard?tab=products&status=inactive" />
        <Kpi label={t("overview.kpiRecommendable")} value={recommendable.length} sub={t("overview.kpiRecommendableSub")} href="/dashboard?tab=products" />
        <Kpi label={t("overview.kpiQuizzes")} value={publishedQuizzes.length} sub={t("overview.kpiQuizzesSub", { n: quizzes.length })} href="/dashboard?tab=quiz" />
      </dl>

      <div className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Section
          title={t("overview.attentionTitle")}
          description={issues.length ? t("overview.attentionBody") : undefined}
          flush
        >
          {issues.length === 0 ? (
            <div className="flex items-center gap-3 px-4 py-6 sm:px-6">
              <FiCheckCircle size={20} className="shrink-0 text-emerald-600" />
              <p className="text-sm text-fg">{t("overview.allGood")}</p>
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {issues.map((issue) => (
                <li key={issue.key}>
                  <Link
                    href={issue.href}
                    className="group flex items-start gap-3 px-4 py-4 transition hover:bg-subtle/60 sm:px-6"
                  >
                    <span
                      className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        issue.tone === "warning"
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                          : "bg-subtle text-fg-muted"
                      }`}
                    >
                      <issue.icon size={16} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-fg">{issue.title}</span>
                      <span className="mt-0.5 block truncate text-sm text-fg-muted">{issue.body}</span>
                    </span>
                    <span className="mt-1 hidden shrink-0 items-center gap-1 text-sm font-medium text-brand-600 sm:inline-flex">
                      {issue.action}
                      <FiArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <div className="flex flex-col gap-6">
          <Section title={t("quizEd.linkTitle")} description={t("overview.quizLinkBody")}>
            <ShareLinkRow label={t("quizEd.quizLinkLabel")} path="/quiz" openable />
          </Section>
          <Section title={t("overview.shortcuts")} flush>
            <ul className="divide-y divide-line">
              <Shortcut href="/dashboard?tab=products" icon={FiBox}>{t("overview.manageProducts")}</Shortcut>
              <Shortcut href="/dashboard?tab=quiz" icon={FiHelpCircle}>{t("overview.editQuiz")}</Shortcut>
              <Shortcut href="/dashboard?tab=site" icon={FiFileText}>{t("overview.editSite")}</Shortcut>
            </ul>
          </Section>
        </div>
      </div>
    </>
  );
}

function Kpi({ label, value, sub, href }: { label: string; value: number; sub: string; href: string }) {
  return (
    <Link href={href} className="card group block p-4 transition hover:border-line-strong sm:p-5">
      <dt className="text-sm font-medium text-fg-muted">{label}</dt>
      <dd className="mt-2 font-display text-3xl font-semibold tabular-nums tracking-tight text-fg">{value}</dd>
      <dd className="mt-1 text-xs text-fg-faint">{sub}</dd>
    </Link>
  );
}

function Shortcut({ href, icon: Icon, children }: { href: string; icon: IconType; children: ReactNode }) {
  return (
    <li>
      <Link href={href} className="group flex items-center gap-3 px-4 py-3 text-sm font-medium text-fg transition hover:bg-subtle/60 sm:px-6">
        <Icon size={16} className="shrink-0 text-fg-muted" />
        <span className="flex-1">{children}</span>
        <FiArrowRight size={14} className="text-fg-faint transition-transform group-hover:translate-x-0.5" />
      </Link>
    </li>
  );
}
