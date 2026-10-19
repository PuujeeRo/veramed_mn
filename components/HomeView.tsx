"use client";

// Client half of the home page. The Server Component in
// app/[locale]/(site)/page.tsx fetches the company, products, the main
// quiz and categories; this renders them.
//
// The design concept's language: one big colour block for the hero (the
// brand's crimson) with the products fanned across it, chips with icons
// for "what do you need support with", products on their own colour tiles.
// The quiz is the reason this site exists, so it leads: the hero's main
// action, and further down its real first question — every answer there is
// a way into /quiz.

import Image from "next/image";
import { FiArrowRight, FiCheck, FiClock, FiMessageCircle, FiUserX } from "react-icons/fi";
import { Link } from "@/lib/navigation";
import { localized, useLanguage } from "@/lib/i18n";
import { isQuizReady } from "@/lib/scoring";
import { onImageError } from "@/lib/media";
import { categoryIcon } from "@/lib/categoryIcons";
import { Brand, Category, Product, Quiz } from "@/lib/types";
import ProductTile from "@/components/ProductTile";

interface HomeViewProps {
  brand: Brand;
  products: Product[];
  /** The main quiz — the one /quiz opens — or null when none is published. */
  quiz: Quiz | null;
  categories: Category[];
}

// How many products the home page shows before "see all".
const FEATURED_LIMIT = 8;

const STEPS = [
  { title: "home.step1Title", body: "home.step1Body" },
  { title: "home.step2Title", body: "home.step2Body" },
  { title: "home.step3Title", body: "home.step3Body" },
];

/** Leaf shapes drifting behind the hero — the leaf from the company logo. */
function Leaves() {
  const leaf = "M50 4C22 22 10 52 18 96c40-6 66-38 32-92z";
  return (
    <svg aria-hidden="true" viewBox="0 0 800 400" preserveAspectRatio="xMidYMid slice" className="pointer-events-none absolute inset-0 h-full w-full text-black/[0.08]">
      <g fill="currentColor">
        <path d={leaf} transform="translate(560 -10) rotate(32 50 50) scale(2.4)" />
        <path d={leaf} transform="translate(380 240) rotate(-42 50 50) scale(1.6)" />
        <path d={leaf} transform="translate(-30 260) rotate(120 50 50) scale(1.8)" />
        <path d={leaf} transform="translate(720 280) rotate(160 50 50) scale(1.1)" />
      </g>
    </svg>
  );
}

export default function HomeView({ brand, products, quiz, categories }: HomeViewProps) {
  const { locale, t } = useLanguage();

  // A quiz needs both questions and something to recommend.
  const hasQuiz = isQuizReady(quiz, products);
  const questions = quiz?.questions ?? [];
  const firstQuestion = questions[0];
  const featured = products.slice(0, FEATURED_LIMIT);
  const fan = products.slice(0, 3);
  const aboutHtml = localized(locale, brand.about_mn ?? "", brand.about_en);
  const usedCategories = categories.filter((c) => products.some((p) => p.categories.includes(c.slug)));

  return (
    <>
      {/* ---------- Hero ---------- */}
      <section className="px-3 pt-3 sm:px-6 sm:pt-6">
        <div className="accent-crimson accent-hero relative mx-auto max-w-6xl overflow-hidden rounded-[1.75rem] sm:rounded-[2.25rem]">
          <Leaves />
          <div className="relative grid items-center gap-10 px-6 py-12 sm:px-10 sm:py-16 lg:grid-cols-12 lg:gap-6 lg:px-14 lg:py-20">
            <div className="lg:col-span-7">
              <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm font-medium text-white ring-1 ring-inset ring-white/25 backdrop-blur">
                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[rgb(var(--brand-grad-4))]" />
                {brand.name}
              </p>
              <h1 className="mt-5 max-w-[16ch] font-display text-[2.25rem] font-semibold leading-[1.04] tracking-[-0.035em] text-white sm:text-[3.25rem] lg:text-[3.75rem]">
                {localized(locale, brand.quizIntro_mn, brand.quizIntro_en)}
              </h1>
              <p className="mt-5 max-w-[46ch] text-base leading-relaxed text-white/85 sm:text-lg">
                {t(hasQuiz ? "home.subtitle" : "home.subtitleNoQuiz")}
              </p>

              <div className="mt-8 flex flex-col gap-3 min-[420px]:flex-row min-[420px]:items-center">
                {hasQuiz && (
                  <Link
                    href="/quiz"
                    className="group inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[rgb(var(--brand-grad-4))] px-7 font-semibold text-[rgb(41_20_8)] shadow-[0_10px_30px_-10px_rgb(0_0_0/0.45)] transition hover:brightness-95 active:scale-[0.98]"
                  >
                    {t("quiz.start")}
                    <FiArrowRight className="shrink-0 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                )}
                <Link
                  href="/products"
                  className="inline-flex h-12 items-center justify-center rounded-full px-7 font-semibold text-white ring-1 ring-inset ring-white/40 transition hover:bg-white/10 active:scale-[0.98]"
                >
                  {t("home.seeProducts")}
                </Link>
              </div>

              {hasQuiz && (
                <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/80">
                  <li className="inline-flex items-center gap-1.5"><FiClock size={14} /> {t("home.factTime")}</li>
                  <li className="inline-flex items-center gap-1.5"><FiUserX size={14} /> {t("home.factNoSignup")}</li>
                  <li className="inline-flex items-center gap-1.5"><FiMessageCircle size={14} /> {t("home.factOrder")}</li>
                </ul>
              )}
            </div>

            {/* The products, fanned like the concept's bottles. */}
            {fan.length > 0 && (
              <div aria-hidden="true" className="relative mx-auto flex h-64 w-full max-w-md items-end justify-center sm:h-80 lg:col-span-5 lg:h-[24rem]">
                {fan.map((p, i) => {
                  const pos = fan.length === 1 ? ["z-10"] : ["z-0 -rotate-[9deg] -mr-16 sm:-mr-20", "z-10 -mb-4", "z-0 rotate-[9deg] -ml-16 sm:-ml-20"];
                  const cls = fan.length === 2 ? ["z-0 -rotate-[8deg] -mr-10", "z-10 rotate-[6deg]"][i] : pos[i];
                  return (
                    <Image
                      key={p.id}
                      src={p.imageUrl}
                      alt=""
                      width={320}
                      height={320}
                      unoptimized
                      priority={i === 1}
                      onError={onImageError}
                      className={`h-auto w-1/2 max-w-[15rem] object-contain drop-shadow-[0_30px_30px_rgb(0_0_0/0.3)] motion-safe:animate-fade-up ${cls}`}
                      style={{ animationDelay: `${i * 90}ms` }}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ---------- What do you need? (category chips) ---------- */}
      {usedCategories.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pt-12 sm:px-6 sm:pt-16">
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
            <h2 className="font-display text-2xl font-semibold tracking-tight text-fg sm:text-3xl">{t("home.needTitle")}</h2>
            <p className="max-w-[44ch] text-sm text-fg-muted">{t("home.needBody")}</p>
          </div>
          <ul className="mt-6 flex flex-wrap gap-2.5">
            {usedCategories.map((c) => {
              const Icon = categoryIcon(c.slug);
              return (
                <li key={c.slug}>
                  <Link
                    href={`/products?category=${encodeURIComponent(c.slug)}`}
                    className="group inline-flex h-11 items-center gap-2 rounded-full border border-line bg-surface pl-2 pr-4 text-sm font-medium text-fg shadow-xs transition hover:border-brand-500 hover:text-brand-700"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-50 text-brand-600 transition group-hover:bg-brand-600 group-hover:text-white">
                      <Icon size={14} />
                    </span>
                    {localized(locale, c.name_mn, c.name_en)}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* ---------- Products ---------- */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <h2 className="font-display text-2xl font-semibold tracking-tight text-fg sm:text-3xl">{t("brand.products")}</h2>
          {products.length > featured.length && (
            <Link href="/products" className="group inline-flex items-center gap-1 font-medium text-brand-600 transition hover:text-brand-700">
              {t("product.seeAll", { count: products.length })}
              <FiArrowRight size={14} className="shrink-0 transition-transform group-hover:translate-x-0.5" />
            </Link>
          )}
        </div>
        {featured.length === 0 ? (
          <p className="mt-6 text-fg-muted">{t("brand.noProducts")}</p>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-4 min-[360px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 lg:gap-5">
            {featured.map((p) => (
              <ProductTile key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>

      {/* ---------- How the quiz works + its real first question ---------- */}
      {hasQuiz && firstQuestion && (
        <section className="bg-subtle/70">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-12 lg:gap-14">
            <div className="lg:col-span-6">
              <h2 className="font-display text-2xl font-semibold tracking-tight text-fg sm:text-3xl">{t("home.stepsTitle")}</h2>
              <p className="mt-3 max-w-[48ch] leading-relaxed text-fg-muted">{t("home.stepsBody")}</p>
              <ol className="mt-8 flex flex-col gap-6">
                {STEPS.map((step, i) => (
                  <li key={step.title} className="flex gap-4">
                    <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface font-display text-base font-semibold tabular-nums text-brand-600 shadow-xs ring-1 ring-line">
                      {i + 1}
                    </span>
                    <div>
                      <h3 className="text-base font-semibold text-fg">{t(step.title)}</h3>
                      <p className="mt-1 max-w-[52ch] text-sm leading-relaxed text-fg-muted">{t(step.body)}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <div className="lg:col-span-6">
              <div className="mx-auto w-full max-w-md rounded-[1.5rem] border border-line bg-surface p-5 shadow-pop sm:p-7">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-medium tabular-nums text-fg-faint">{t("quiz.progress", { current: 1, total: questions.length })}</p>
                  <span className="h-1.5 w-24 overflow-hidden rounded-full bg-subtle">
                    <span className="block h-full rounded-full bg-brand-600" style={{ width: `${100 / questions.length}%` }} />
                  </span>
                </div>
                <h3 className="mt-4 font-display text-xl font-semibold leading-snug tracking-tight text-fg">
                  {localized(locale, firstQuestion.text_mn, firstQuestion.text_en)}
                </h3>
                <div className="mt-5 flex flex-col gap-2">
                  {firstQuestion.answers.slice(0, 5).map((a, i) => (
                    <Link
                      key={a.id}
                      href="/quiz"
                      className="group flex items-center gap-3 rounded-xl border border-line px-3.5 py-3 text-sm text-fg transition hover:border-brand-500 hover:bg-brand-50"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-line text-xs tabular-nums text-fg-faint transition group-hover:border-brand-500 group-hover:text-brand-700">
                        {i + 1}
                      </span>
                      <span className="flex-1">{localized(locale, a.text_mn, a.text_en)}</span>
                      <FiArrowRight size={14} className="shrink-0 text-fg-faint transition group-hover:translate-x-0.5 group-hover:text-brand-600" />
                    </Link>
                  ))}
                </div>
                <p className="mt-4 flex items-center gap-1.5 text-xs text-fg-muted">
                  <FiCheck size={13} className="text-emerald-600" /> {t("home.teaserNote")}
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ---------- About preview ---------- */}
      {aboutHtml && (
        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <div className="grid gap-8 rounded-[1.75rem] border border-line bg-surface p-6 shadow-card sm:p-10 lg:grid-cols-12 lg:gap-12">
            <div className="lg:col-span-4">
              <Image src={brand.logoUrl} alt="" width={56} height={56} unoptimized onError={onImageError} className="h-14 w-14 object-contain" />
              <h2 className="mt-4 font-display text-2xl font-semibold tracking-tight text-fg sm:text-3xl">{t("nav.about")}</h2>
            </div>
            <div className="lg:col-span-8">
              {/* A preview — it fades out and /about carries the rest.
                  Sanitized server-side on save. */}
              <div
                className="prose max-h-44 max-w-[65ch] overflow-hidden text-fg-muted [mask-image:linear-gradient(#000_55%,transparent)]"
                dangerouslySetInnerHTML={{ __html: aboutHtml }}
              />
              <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3">
                <Link href="/about" className="group inline-flex items-center gap-1 font-medium text-brand-600 transition hover:text-brand-700">
                  {t("home.readMore")}
                  <FiArrowRight size={14} className="shrink-0 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link href="/contact" className="font-medium text-fg-muted transition hover:text-fg">
                  {t("nav.contact")}
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
