"use client";

// Drives the quiz end to end:
//   Intro → Question (one at a time) → Analyzing → Result
// Sits inside the site layout (header and footer come from there).

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Link } from "@/lib/navigation";
import { FiArrowLeft, FiArrowRight, FiCheck, FiChevronLeft, FiRefreshCw } from "react-icons/fi";
import { useLanguage, localized } from "@/lib/i18n";
import { onImageError } from "@/lib/media";
import { Brand, Category, Product, Quiz, QuizAnswerState, QuizQuestion } from "@/lib/types";
import { isQuizReady, quizPool, scoreQuiz } from "@/lib/scoring";
import { recordQuizSessionStart, recordQuizComplete } from "@/lib/stats";
import ProgressBar from "./ProgressBar";
import ProductCard from "./ProductCard";

type Stage = "intro" | "question" | "analyzing" | "result";

interface QuizFlowProps {
  brand: Brand;
  /** The quiz being taken; null when there is none to show (/quiz with no
   *  published quiz). */
  quiz: Quiz | null;
  /** All active products; narrowed to the quiz's own pool here. */
  products: Product[];
  /** Resolves the result page's category label (see categoryLabel() below). */
  categories: Category[];
}

export default function QuizFlow({
  brand,
  quiz,
  products,
  categories,
}: QuizFlowProps) {
  const questions = quiz?.questions ?? [];
  // The products this quiz can actually recommend — shown on the intro so
  // a visitor sees what they're choosing between before they start.
  const pool = quiz ? quizPool(quiz, products) : [];
  // No questions, or nothing to recommend: every visitor would end on
  // "no match", so the quiz reads as not set up yet instead.
  const ready = isQuizReady(quiz, products);
  const { locale, t } = useLanguage();
  const [stage, setStage] = useState<Stage>("intro");
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswerState[]>([]);
  // Null until the start call resolves (or if it fails) — recordQuizComplete
  // treats a null id as "nothing to complete," never as a reason to block
  // the quiz itself (see lib/stats.ts).
  const [sessionId, setSessionId] = useState<string | null>(null);

  // `brand`, `quiz` and `products` all arrive already-resolved (fetched
  // server-side in app/[locale]/(site)/quiz/).
  //
  // A quiz "session" (`quiz_sessions`) starts here — the
  // moment a visitor opens a properly set-up quiz, not just when they click
  // Start on the intro screen. Guarded with a ref: Strict Mode double-invokes
  // effects in dev, which would otherwise double-count every visit locally.
  const sessionStarted = useRef(false);
  const quizId = quiz?.id;
  useEffect(() => {
    if (ready && quizId && !sessionStarted.current) {
      sessionStarted.current = true;
      recordQuizSessionStart(brand.id, quizId).then(setSessionId);
    }
  }, [brand.id, quizId, ready]);

  const currentQuestion = questions[step];

  function selectAnswer(answerId: string) {
    const next = [...answers];
    next[step] = { questionId: currentQuestion.id, answerId };
    setAnswers(next);

    if (step + 1 < questions.length) {
      setStep(step + 1);
    } else {
      setStage("analyzing");
      setTimeout(() => setStage("result"), 1200);
    }
  }

  // Number keys pick an answer — each option shows its number. No deps
  // array on purpose: selectAnswer closes over step/answers, so the
  // listener is rebound every render rather than going stale.
  useEffect(() => {
    if (stage !== "question" || !currentQuestion) return;
    const options = currentQuestion.answers;
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
      const picked = options[Number(e.key) - 1];
      if (/^[1-9]$/.test(e.key) && picked) selectAnswer(picked.id);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function goBack() {
    if (step > 0) {
      setStep(step - 1);
      setStage("question");
    }
  }

  function retake() {
    setAnswers([]);
    setStep(0);
    setStage("intro");
    // Retaking opens a fresh attempt — start a matching new session so a
    // run of retakes can't push `completed` past `started` (the mount
    // effect above only fires once per page visit). Reset first so the
    // result screen's completion effect can't fire against the old id
    // while this one is still resolving.
    setSessionId(null);
    if (quizId) recordQuizSessionStart(brand.id, quizId).then(setSessionId);
  }

  if (!ready) {
    return (
      <div className="mx-auto flex min-h-[60dvh] w-full max-w-2xl flex-col px-4 py-6 sm:px-6">
        <div className="my-auto py-10">
          <p className="text-lg text-fg-muted">{t("quiz.notSetUp")}</p>
          <Link
            href="/products"
            className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 transition hover:text-brand-700"
          >
            <FiArrowLeft size={14} className="shrink-0" />
            {t("product.allProducts")}
          </Link>
        </div>
      </div>
    );
  }

  const picked = answers[step]?.answerId;

  // Outer wrapper widens for the result (and the skeleton standing in for
  // it, so the width doesn't jump when the result lands) but stays narrow
  // for intro/question — a single question reads better as a column than
  // stretched across a wide monitor.
  const wide = stage === "result" || stage === "analyzing";

  return (
    <div
      className={`mx-auto flex min-h-[70dvh] w-full flex-col px-4 py-8 sm:px-6 sm:py-12 ${
        wide ? "max-w-4xl" : "max-w-2xl"
      }`}
    >
      {stage === "intro" && (
        <section className="my-auto py-10 motion-safe:animate-fade-up">
          {pool.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <div className="flex -space-x-3">
                {pool.slice(0, 4).map((p) => (
                  <Image
                    key={p.id}
                    src={p.imageUrl}
                    alt=""
                    width={48}
                    height={48}
                    unoptimized
                    onError={onImageError}
                    className="h-12 w-12 rounded-xl object-cover ring-2 ring-page"
                  />
                ))}
              </div>
              <p className="text-sm tabular-nums text-fg-muted">
                {t("quiz.introPool", { count: pool.length })}
              </p>
            </div>
          )}

          <h1 className="mt-6 text-[1.75rem] font-semibold leading-[1.15] tracking-tight text-fg sm:text-4xl">
            {localized(locale, quiz.title_mn, quiz.title_en)}
          </h1>
          <p className="mt-4 max-w-[52ch] leading-relaxed text-fg-muted sm:text-lg">
            {t("brand.quizCardBody", { count: questions.length })}
          </p>

          <button
            onClick={() => setStage("question")}
            className="group mt-8 inline-flex items-center gap-2 rounded-full bg-brand-600 px-8 py-3 font-medium text-white transition hover:bg-brand-700 active:scale-[0.98]"
          >
            {t("quiz.start")}
            <FiArrowRight className="shrink-0 transition-transform group-hover:translate-x-0.5" />
          </button>
        </section>
      )}

      {stage === "question" && currentQuestion && (
        <section className="w-full flex-1 pt-2 sm:pt-8">
          {/* Back sits in the progress row, not under the answers — the
              answer list changes length per question, and a control that
              moves around is one a thumb misses. */}
          <div className="mb-3 flex min-h-[1.75rem] items-center justify-between gap-3 text-sm">
            {step > 0 ? (
              <button
                onClick={goBack}
                className="-ml-1 inline-flex items-center gap-1 rounded-md px-1 py-0.5 text-fg-muted transition hover:text-fg"
              >
                <FiChevronLeft className="shrink-0" /> {t("quiz.back")}
              </button>
            ) : (
              <span />
            )}
            <span className="tabular-nums text-fg-faint">
              {t("quiz.progress", { current: step + 1, total: questions.length })}
            </span>
          </div>
          <ProgressBar current={step + 1} total={questions.length} />

          {/* Keyed on the step so each question animates in. */}
          <div key={step} className="motion-safe:animate-fade-up">
            <h1 className="mt-8 text-2xl font-semibold leading-snug tracking-tight text-fg sm:mt-10 sm:text-3xl">
              {localized(locale, currentQuestion.text_mn, currentQuestion.text_en)}
            </h1>

            <div className="mt-6 flex flex-col gap-3 sm:mt-8">
              {currentQuestion.answers.map((answer, i) => {
                const selected = picked === answer.id;
                return (
                  <button
                    key={answer.id}
                    onClick={() => selectAnswer(answer.id)}
                    aria-pressed={selected}
                    className={`group flex items-center gap-3 rounded-xl border px-4 py-3.5 text-left transition active:scale-[0.99] ${
                      selected
                        ? "border-brand-500 bg-brand-50 text-fg"
                        : "border-line bg-surface text-fg hover:border-brand-500 hover:bg-brand-50"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border text-xs font-medium tabular-nums transition ${
                        selected
                          ? "border-brand-600 bg-brand-600 text-white"
                          : "border-line text-fg-faint group-hover:border-brand-500 group-hover:text-brand-700"
                      }`}
                    >
                      {selected ? <FiCheck size={14} /> : i + 1}
                    </span>
                    <span className="min-w-0">
                      {localized(locale, answer.text_mn, answer.text_en)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* A placeholder in the shape of the result card, not a spinner —
          the page settles into the result instead of swapping to it. */}
      {stage === "analyzing" && (
        <section className="w-full flex-1" role="status" aria-live="polite">
          <p className="text-2xl font-semibold tracking-tight text-fg sm:text-3xl">
            {t("quiz.analyzing")}
          </p>
          <div className="mt-6 overflow-hidden rounded-2xl border border-line bg-surface motion-safe:animate-pulse sm:grid sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
            <div className="h-56 bg-subtle sm:h-auto sm:min-h-[18rem]" />
            <div className="flex flex-col gap-3 p-6 sm:p-8">
              <div className="h-3 w-1/3 rounded bg-subtle" />
              <div className="h-6 w-2/3 rounded bg-subtle" />
              <div className="h-3 w-full rounded bg-subtle" />
              <div className="h-3 w-5/6 rounded bg-subtle" />
              <div className="mt-4 h-9 w-32 rounded-full bg-subtle" />
            </div>
          </div>
        </section>
      )}

      {stage === "result" && (
        <QuizResultView
          brand={brand}
          questions={questions}
          pool={pool}
          categories={categories}
          answers={answers}
          sessionId={sessionId}
          onRetake={retake}
        />
      )}
    </div>
  );
}

function QuizResultView({
  brand,
  questions,
  pool,
  categories,
  answers,
  sessionId,
  onRetake,
}: {
  brand: Brand;
  questions: QuizQuestion[];
  /** The quiz's own recommendable products (quizPool). */
  pool: Product[];
  categories: Category[];
  answers: QuizAnswerState[];
  sessionId: string | null;
  onRetake: () => void;
}) {
  const { locale, t } = useLanguage();
  const results = scoreQuiz(questions, pool, answers);

  // Session complete (`quiz_sessions.completed_at`) plus one
  // `quiz_results` row per product actually shown — matches the top 1–2
  // rendered below, not every relevant match. Ref-guarded for the same
  // Strict Mode double-invoke reason as the session-start effect; also
  // waits for sessionId to actually resolve, since the start call is async.
  const completionLogged = useRef(false);
  useEffect(() => {
    if (completionLogged.current || !sessionId) return;
    completionLogged.current = true;
    recordQuizComplete(
      brand.id,
      sessionId,
      results.slice(0, 2).map((r) => r.product.id)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brand.id, sessionId]);

  // At most 2 results. Two sit side by side in identical cards so they
  // stay comparable; a lone result gets the row to itself, image beside
  // the copy, rather than one narrow card adrift on a wide screen.
  const shown = results.slice(0, 2);
  const pair = shown.length > 1;

  return (
    <section className="w-full flex-1 motion-safe:animate-fade-up">
      <h1 className="text-2xl font-semibold tracking-tight text-fg sm:text-3xl">
        {t("quiz.resultTitle")}
      </h1>

      {results.length === 0 && (
        <p className="mt-4 text-fg-muted">{t("quiz.noResult")}</p>
      )}

      <div className={`mt-6 grid items-start gap-6 ${pair ? "sm:grid-cols-2" : ""}`}>
        {shown.map((result) => (
          <div key={result.product.id} className="min-w-0">
            <ProductCard
              horizontal={!pair}
              product={result.product}
              reason={categoryLabel(result.matchedCategory, locale, categories)}
            />
            {/* The result card is a summary — this opens the full page. */}
            <Link
              href={`/p/${result.product.id}`}
              className="group mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand-600 transition hover:text-brand-700"
            >
              {t("brand.viewProduct")}
              <FiArrowRight size={13} className="shrink-0 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        ))}
      </div>

      {/* Somewhere to go once the quiz is done. */}
      <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-line pt-6">
        <button
          onClick={onRetake}
          className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-5 py-2 text-sm font-medium text-fg transition hover:border-fg-faint active:scale-[0.98]"
        >
          <FiRefreshCw size={14} className="shrink-0" /> {t("quiz.retake")}
        </button>
        <Link
          href="/products"
          className="group inline-flex items-center gap-1 text-sm font-medium text-fg-muted transition hover:text-fg"
        >
          {t("product.allProducts")}
          <FiArrowRight size={13} className="shrink-0 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </section>
  );
}

// Hand-phrased "why this was recommended" copy for the 8 seeded categories
// ("joint pain", not just the bare category name "joints"). A category the
// manager added later (CategoriesPanel) has no entry in this map and falls
// through to its real name from `categories` — never the raw slug.
function categoryLabel(slug: string, locale: "mn" | "en", categories: Category[]) {
  const labels: Record<string, { mn: string; en: string }> = {
    energy: { mn: "эрч хүч", en: "low energy" },
    sleep: { mn: "нойрны асуудал", en: "poor sleep" },
    digestion: { mn: "хоол боловсруулалт", en: "digestion" },
    immunity: { mn: "дархлаа", en: "immunity" },
    stress: { mn: "стресс", en: "stress" },
    joints: { mn: "үе мөч", en: "joint pain" },
    skin: { mn: "арьс, үс", en: "skin/hair" },
    weight: { mn: "жин", en: "weight" },
  };
  if (labels[slug]) return labels[slug][locale];
  const own = categories.find((c) => c.slug === slug);
  return own ? localized(locale, own.name_mn, own.name_en) : slug;
}
