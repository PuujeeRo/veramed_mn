"use client";

// One quiz's editor — `/dashboard?tab=quiz&quiz={id}`. The list of quizzes
// is components/QuizzesPanel.tsx.
//
// A quiz is its title (the intro headline), its link (/quiz/{slug}),
// whether it's published, the products it may recommend, and its
// questions — each answer adds points to a category. Everything is edited
// locally, then saved as one set (PUT /api/brands/[id]/quizzes/[quizId]);
// the response carries the real question ids, adopted for the next save.
//
// The side panel answers the question a manager actually has — "will this
// quiz recommend something?": it lists each category answers point at and
// how many of THIS quiz's published products carry it. An answer pointing
// at a category none of them carries is flagged right on its row.

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Link, useRouter } from "@/lib/navigation";
import {
  FiAlertTriangle,
  FiArrowDown,
  FiArrowUp,
  FiExternalLink,
  FiEye,
  FiEyeOff,
  FiHelpCircle,
  FiMoreHorizontal,
  FiPlus,
  FiStar,
  FiTrash2,
  FiX,
} from "react-icons/fi";
import { Category, Product, Quiz, QuizQuestion } from "@/lib/types";
import { localized, useLanguage } from "@/lib/i18n";
import { getCategories } from "@/lib/categories";
import { onImageError } from "@/lib/media";
import { quizPool } from "@/lib/scoring";
import ShareLinkRow from "./ShareLinkRow";
import PageHeader from "./ui/PageHeader";
import Section from "./ui/Section";
import Field from "./ui/Field";
import Switch from "./ui/Switch";
import StatusPill from "./ui/StatusPill";
import Menu from "./ui/Menu";
import EmptyState from "./ui/EmptyState";
import UnsavedBar from "./ui/UnsavedBar";
import ConfirmDialog from "./ui/ConfirmDialog";
import { useToast } from "./ui/Toast";

interface QuizEditorProps {
  quiz: Quiz;
  /** Whether this is the quiz /quiz opens. */
  isMain: boolean;
  /** Every non-deleted product, hidden ones included. */
  products: Product[];
  onSaved: (quiz: Quiz) => void;
  onDeleted: (quizId: string) => void;
  onMadeMain: (quiz: Quiz) => void;
}

type Answer = QuizQuestion["answers"][number];

interface QuizForm {
  title_mn: string;
  title_en: string;
  slug: string;
  status: Quiz["status"];
  productIds: string[];
  questions: QuizQuestion[];
}

/** Same rule as the save route: lowercase Latin letters and digits in
 *  hyphen-separated groups. */
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const uid = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

function newAnswer(category: string): Answer {
  return { id: uid("a"), text_mn: "", text_en: "", category, points: 1 };
}

function fromQuiz(quiz: Quiz): QuizForm {
  return {
    title_mn: quiz.title_mn,
    title_en: quiz.title_en ?? "",
    slug: quiz.slug,
    status: quiz.status,
    productIds: [...quiz.productIds].sort(),
    questions: quiz.questions,
  };
}

export default function QuizEditor({ quiz, isMain, products, onSaved, onDeleted, onMadeMain }: QuizEditorProps) {
  const { locale, t } = useLanguage();
  const router = useRouter();
  const toast = useToast();
  const [baseline, setBaseline] = useState<QuizForm>(() => fromQuiz(quiz));
  const [form, setForm] = useState<QuizForm>(() => fromQuiz(quiz));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const [slugTaken, setSlugTaken] = useState(false);
  const [pendingRemove, setPendingRemove] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { questions } = form;
  const set = <K extends keyof QuizForm>(key: K, value: QuizForm[K]) => setForm((f) => ({ ...f, [key]: value }));
  const setQuestions = (update: (qs: QuizQuestion[]) => QuizQuestion[]) =>
    setForm((f) => ({ ...f, questions: update(f.questions) }));

  // Fetched, never a static import — answers tag against this list, so a
  // stale copy would let an answer point at a removed category.
  const [categoryList, setCategoryList] = useState<Category[]>([]);
  useEffect(() => {
    getCategories().then(setCategoryList).catch(() => setCategoryList([]));
  }, []);
  const defaultCategory = categoryList[0]?.slug ?? "";
  const categoryName = (slug: string) => {
    const c = categoryList.find((x) => x.slug === slug);
    return c ? localized(locale, c.name_mn, c.name_en) : slug;
  };

  // Categories this quiz can actually land on: carried by one of its own
  // published products.
  const covered = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of quizPool(form, products)) for (const c of p.categories) map.set(c, (map.get(c) ?? 0) + 1);
    return map;
  }, [form, products]);

  const usedCategories = useMemo(() => {
    const map = new Map<string, number>();
    for (const q of questions) for (const a of q.answers) if (a.points > 0) map.set(a.category, (map.get(a.category) ?? 0) + 1);
    return [...map.entries()];
  }, [questions]);

  const dirty = JSON.stringify(form) !== JSON.stringify(baseline);
  const titleMissing = !form.title_mn.trim();
  const slugInvalid = !SLUG_RE.test(form.slug) || form.slug.length > 40;
  const incomplete = questions.some((q) => !q.text_mn.trim() || q.answers.length === 0 || q.answers.some((a) => !a.text_mn.trim() || !a.category));
  const blockedReason = titleMissing
    ? t("quizEd.titleMissing")
    : slugInvalid
      ? t("quizEd.slugHint")
      : incomplete
        ? t("quizEd.incomplete")
        : undefined;

  const displayTitle = localized(locale, form.title_mn || quiz.title_mn, form.title_en);
  const savedPublished = baseline.status === "active";
  const selected = new Set(form.productIds);

  function updateQuestion(qIndex: number, patch: Partial<QuizQuestion>) {
    setQuestions((qs) => qs.map((q, i) => (i === qIndex ? { ...q, ...patch } : q)));
  }

  function updateAnswer(qIndex: number, aIndex: number, patch: Partial<Answer>) {
    setQuestions((qs) =>
      qs.map((q, i) => (i === qIndex ? { ...q, answers: q.answers.map((a, j) => (j === aIndex ? { ...a, ...patch } : a)) } : q))
    );
  }

  function addQuestion() {
    setQuestions((qs) => [
      ...qs,
      {
        id: uid("q"),
        brandId: quiz.brandId,
        quizId: quiz.id,
        order: qs.length + 1,
        text_mn: "",
        text_en: "",
        answers: [newAnswer(defaultCategory), newAnswer(defaultCategory)],
      },
    ]);
    // Scroll the new card into view once it's rendered.
    setTimeout(() => document.getElementById("quiz-end")?.scrollIntoView({ behavior: "smooth", block: "end" }), 50);
  }

  function moveQuestion(qIndex: number, direction: -1 | 1) {
    setQuestions((qs) => {
      const target = qIndex + direction;
      if (target < 0 || target >= qs.length) return qs;
      const next = [...qs];
      [next[qIndex], next[target]] = [next[target], next[qIndex]];
      return next.map((q, i) => ({ ...q, order: i + 1 }));
    });
  }

  function requestRemove(qIndex: number) {
    const q = questions[qIndex];
    const hasContent = q.text_mn.trim() || q.answers.some((a) => a.text_mn.trim());
    if (hasContent) setPendingRemove(qIndex);
    else setQuestions((qs) => qs.filter((_, i) => i !== qIndex));
  }

  function toggleProduct(id: string) {
    set("productIds", (selected.has(id) ? form.productIds.filter((x) => x !== id) : [...form.productIds, id]).sort());
  }

  async function handleSave() {
    setSaving(true);
    setError(false);
    setSlugTaken(false);
    try {
      const res = await fetch(`/api/brands/${quiz.brandId}/quizzes/${quiz.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title_mn: form.title_mn.trim(),
          title_en: form.title_en.trim(),
          slug: form.slug,
          status: form.status,
          productIds: form.productIds,
          questions: questions.map((q) => ({
            text_mn: q.text_mn.trim(),
            text_en: q.text_en.trim(),
            answers: q.answers.map((a) => ({ text_mn: a.text_mn.trim(), text_en: a.text_en.trim(), category: a.category, points: a.points })),
          })),
        }),
      });
      if (res.status === 409) {
        setSlugTaken(true);
        setError(true);
        return;
      }
      if (!res.ok) throw new Error(await res.text());
      // Adopt the server's real ids so the next save targets these rows.
      const { quiz: saved } = (await res.json()) as { quiz: Quiz };
      const next = fromQuiz(saved);
      setForm(next);
      setBaseline(next);
      onSaved(saved);
      toast(t("common.saved"));
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  }

  async function makeMain() {
    try {
      const res = await fetch(`/api/brands/${quiz.brandId}/quizzes/${quiz.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ main: true }),
      });
      if (!res.ok) throw new Error(await res.text());
      onMadeMain(((await res.json()) as { quiz: Quiz }).quiz);
      toast(t("quizList.madeMain"));
    } catch {
      toast(t("common.saveError"), "error");
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/brands/${quiz.brandId}/quizzes/${quiz.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      toast(t("quizList.deleted"));
      // Nothing left to save — leaving must not trip the unsaved warning.
      setForm(baseline);
      router.push("/dashboard?tab=quiz");
      onDeleted(quiz.id);
    } catch {
      toast(t("common.saveError"), "error");
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  return (
    <>
      <PageHeader
        crumbs={[{ label: t("dash.tabQuiz"), href: "/dashboard?tab=quiz" }, { label: displayTitle }]}
        title={displayTitle}
        meta={
          <span className="flex flex-wrap items-center gap-1.5">
            {isMain && (
              <StatusPill tone="brand" dot={false}>
                <span title={t("quizList.mainHint")} className="inline-flex items-center gap-1">
                  <FiStar size={11} /> {t("quizList.main")}
                </span>
              </StatusPill>
            )}
            {savedPublished ? (
              <StatusPill tone="success">{t("dash.statusPublished")}</StatusPill>
            ) : (
              <StatusPill tone="neutral">{t("dash.statusHidden")}</StatusPill>
            )}
          </span>
        }
        actions={
          <>
            {savedPublished && (
              <Link href={`/quiz/${baseline.slug}`} target="_blank" className="btn-secondary">
                <FiExternalLink size={15} /> {t("dash.previewQuiz")}
              </Link>
            )}
            <button type="button" onClick={addQuestion} className="btn-primary">
              <FiPlus size={16} /> {t("quizEd.addQuestion")}
            </button>
            <Menu
              label={t("dash.moreActions")}
              trigger={<FiMoreHorizontal size={18} />}
              items={[
                { label: t("quizList.makeMain"), icon: FiStar, onSelect: makeMain, disabled: isMain },
                { label: t("quizEd.deleteQuiz"), icon: FiTrash2, onSelect: () => setConfirmDelete(true), danger: true },
              ]}
            />
          </>
        }
      />

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="flex min-w-0 flex-col gap-4">
          <Section
            title={t("quizEd.settingsTitle")}
            aside={<Switch checked={form.status === "active"} onChange={(on) => set("status", on ? "active" : "inactive")} label={t("quizEd.publishToggle")} />}
          >
            <p className="mb-5 flex items-start gap-2 text-sm leading-relaxed text-fg-muted">
              {form.status === "active" ? (
                <FiEye size={16} className="mt-0.5 shrink-0 text-emerald-600" />
              ) : (
                <FiEyeOff size={16} className="mt-0.5 shrink-0 text-fg-faint" />
              )}
              {t(form.status === "active" ? "quizEd.publishedBody" : "quizEd.hiddenBody")}
            </p>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                label={t("quizEd.titleMn")}
                htmlFor="quiz-title-mn"
                required
                hint={t("quizEd.titleHint")}
                error={titleMissing ? t("validation.required") : undefined}
              >
                <input
                  id="quiz-title-mn"
                  value={form.title_mn}
                  onChange={(e) => set("title_mn", e.target.value)}
                  className={`field ${titleMissing ? "field-invalid" : ""}`}
                />
              </Field>
              <Field label={t("quizEd.titleEn")} htmlFor="quiz-title-en">
                <input id="quiz-title-en" value={form.title_en} onChange={(e) => set("title_en", e.target.value)} className="field" />
              </Field>
              <Field
                label={t("quizEd.slug")}
                htmlFor="quiz-slug"
                required
                className="sm:col-span-2"
                hint={t("quizEd.slugHint")}
                error={slugInvalid ? t("quizEd.slugHint") : slugTaken ? t("quizEd.slugTaken") : undefined}
              >
                <div className="flex items-stretch">
                  <span className="inline-flex shrink-0 items-center rounded-l-lg border border-r-0 border-line bg-subtle px-3 font-mono text-sm text-fg-muted">
                    /quiz/
                  </span>
                  <input
                    id="quiz-slug"
                    value={form.slug}
                    onChange={(e) => {
                      setSlugTaken(false);
                      set("slug", e.target.value.toLowerCase().replace(/\s+/g, "-"));
                    }}
                    maxLength={40}
                    spellCheck={false}
                    autoCapitalize="off"
                    className={`field min-w-0 rounded-l-none font-mono ${slugInvalid || slugTaken ? "field-invalid" : ""}`}
                  />
                </div>
              </Field>
            </div>
          </Section>

          <Section
            title={t("quizEd.productsTitle")}
            description={t("quizEd.productsBody")}
            aside={<span className="text-sm tabular-nums text-fg-muted">{t("quizEd.selectedCount", { n: form.productIds.length })}</span>}
            flush
          >
            {products.length === 0 ? (
              <p className="px-4 py-5 text-sm text-fg-muted sm:px-6">{t("quizEd.noProductsYet")}</p>
            ) : (
              <>
                <div className="flex flex-wrap gap-2 border-b border-line px-4 py-2.5 sm:px-6">
                  <button type="button" onClick={() => set("productIds", products.map((p) => p.id).sort())} className="btn-ghost btn-sm">
                    {t("quizEd.selectAll")}
                  </button>
                  <button type="button" onClick={() => set("productIds", [])} disabled={form.productIds.length === 0} className="btn-ghost btn-sm">
                    {t("quizEd.selectNone")}
                  </button>
                </div>
                <ul className="divide-y divide-line">
                  {products.map((p) => {
                    const on = selected.has(p.id);
                    return (
                      <li key={p.id}>
                        <label className="flex cursor-pointer items-center gap-3 px-4 py-2.5 transition hover:bg-subtle/60 sm:px-6">
                          <input
                            type="checkbox"
                            checked={on}
                            onChange={() => toggleProduct(p.id)}
                            className="h-4 w-4 shrink-0 cursor-pointer rounded border-line-strong accent-brand-600"
                          />
                          <Image
                            src={p.imageUrl}
                            alt=""
                            width={36}
                            height={36}
                            unoptimized
                            onError={onImageError}
                            className="h-9 w-9 shrink-0 rounded-md border border-line bg-subtle object-contain"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-fg">{localized(locale, p.name_mn, p.name_en)}</span>
                            <span className="block truncate text-xs text-fg-faint">
                              {p.categories.length > 0 ? p.categories.map(categoryName).join(", ") : t("quizEd.productNoCategory")}
                            </span>
                          </span>
                          {p.status !== "active" && (
                            <StatusPill tone="neutral">{t("dash.statusHidden")}</StatusPill>
                          )}
                          {on && p.categories.length === 0 && (
                            <span title={t("prodEd.noCategoryWarning")} className="shrink-0 text-amber-500">
                              <FiAlertTriangle size={14} aria-label={t("prodEd.noCategoryWarning")} />
                            </span>
                          )}
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </Section>

          {questions.length === 0 ? (
            <div className="card">
              <EmptyState
                icon={FiHelpCircle}
                title={t("quizEd.emptyTitle")}
                body={t("quizEd.noQuestions")}
                action={
                  <button type="button" onClick={addQuestion} className="btn-primary">
                    <FiPlus size={16} /> {t("quizEd.addQuestion")}
                  </button>
                }
              />
            </div>
          ) : (
            questions.map((q, qIndex) => (
              <section key={q.id} aria-label={t("quizEd.questionN", { n: qIndex + 1 })} className="card overflow-hidden">
                <header className="flex items-center justify-between gap-3 border-b border-line bg-subtle/40 px-4 py-2.5 sm:px-5">
                  <span className="flex items-center gap-2.5 text-sm font-semibold text-fg">
                    <span className="flex h-6 min-w-6 items-center justify-center rounded-md bg-brand-600 px-1.5 text-xs tabular-nums text-white">
                      {qIndex + 1}
                    </span>
                    {t("quizEd.questionN", { n: qIndex + 1 })}
                  </span>
                  <div className="flex items-center gap-0.5">
                    <button type="button" onClick={() => moveQuestion(qIndex, -1)} disabled={qIndex === 0} title={t("quizEd.moveUp")} aria-label={t("quizEd.moveUp")} className="icon-btn">
                      <FiArrowUp size={15} />
                    </button>
                    <button type="button" onClick={() => moveQuestion(qIndex, 1)} disabled={qIndex === questions.length - 1} title={t("quizEd.moveDown")} aria-label={t("quizEd.moveDown")} className="icon-btn">
                      <FiArrowDown size={15} />
                    </button>
                    <button type="button" onClick={() => requestRemove(qIndex)} title={t("quizEd.removeQuestion")} aria-label={t("quizEd.removeQuestion")} className="icon-btn hover:bg-red-500/10 hover:text-red-600">
                      <FiTrash2 size={15} />
                    </button>
                  </div>
                </header>

                <div className="p-4 sm:p-5">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label htmlFor={`${q.id}-mn`} className="field-label">
                        {t("quizEd.qTextMn")}
                        <span aria-hidden="true" className="ml-0.5 text-brand-600">*</span>
                      </label>
                      <input
                        id={`${q.id}-mn`}
                        value={q.text_mn}
                        onChange={(e) => updateQuestion(qIndex, { text_mn: e.target.value })}
                        className={`field ${!q.text_mn.trim() ? "field-invalid" : ""}`}
                      />
                    </div>
                    <div>
                      <label htmlFor={`${q.id}-en`} className="field-label">
                        {t("quizEd.qTextEn")}
                      </label>
                      <input id={`${q.id}-en`} value={q.text_en} onChange={(e) => updateQuestion(qIndex, { text_en: e.target.value })} className="field" />
                    </div>
                  </div>

                  <div className="mt-5">
                    <div className="hidden grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(9rem,0.8fr)_4.5rem_2rem] gap-2 px-1 pb-1.5 text-xs font-medium text-fg-muted md:grid">
                      <span>{t("quizEd.answerMn")}</span>
                      <span>{t("quizEd.answerEn")}</span>
                      <span>{t("quizEd.category")}</span>
                      <span>{t("quizEd.points")}</span>
                      <span className="sr-only">{t("quizEd.removeAnswer")}</span>
                    </div>
                    <ul className="flex flex-col gap-2">
                      {q.answers.map((a, aIndex) => {
                        const dead = a.points > 0 && a.category !== "" && !covered.has(a.category);
                        return (
                          <li
                            key={a.id}
                            className="grid grid-cols-2 gap-2 rounded-lg border border-line bg-subtle/40 p-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(9rem,0.8fr)_4.5rem_2rem] md:items-center md:border-0 md:bg-transparent md:p-0"
                          >
                            <input
                              value={a.text_mn}
                              onChange={(e) => updateAnswer(qIndex, aIndex, { text_mn: e.target.value })}
                              placeholder={t("quizEd.answerMn")}
                              aria-label={`${t("quizEd.answerMn")} ${aIndex + 1}`}
                              className={`field field-sm col-span-2 md:col-span-1 ${!a.text_mn.trim() ? "field-invalid" : ""}`}
                            />
                            <input
                              value={a.text_en}
                              onChange={(e) => updateAnswer(qIndex, aIndex, { text_en: e.target.value })}
                              placeholder={t("quizEd.answerEn")}
                              aria-label={`${t("quizEd.answerEn")} ${aIndex + 1}`}
                              className="field field-sm col-span-2 md:col-span-1"
                            />
                            <div className="relative col-span-2 md:col-span-1">
                              <select
                                value={a.category}
                                onChange={(e) => updateAnswer(qIndex, aIndex, { category: e.target.value })}
                                aria-label={`${t("quizEd.category")} ${aIndex + 1}`}
                                className={`field field-sm ${dead ? "border-amber-500 pr-8" : ""}`}
                              >
                                {!categoryList.some((c) => c.slug === a.category) && <option value={a.category}>{a.category || "—"}</option>}
                                {categoryList.map((c) => (
                                  <option key={c.slug} value={c.slug}>
                                    {localized(locale, c.name_mn, c.name_en)}
                                  </option>
                                ))}
                              </select>
                              {dead && (
                                <span title={t("quizEd.deadAnswer")} className="pointer-events-none absolute right-7 top-1/2 -translate-y-1/2 text-amber-500">
                                  <FiAlertTriangle size={14} aria-label={t("quizEd.deadAnswer")} />
                                </span>
                              )}
                            </div>
                            <input
                              type="number"
                              min={0}
                              max={10}
                              value={a.points}
                              onChange={(e) => updateAnswer(qIndex, aIndex, { points: Math.max(0, Math.min(10, Number(e.target.value) || 0)) })}
                              aria-label={`${t("quizEd.points")} ${aIndex + 1}`}
                              className="field field-sm tabular-nums"
                            />
                            <button
                              type="button"
                              onClick={() => setQuestions((qs) => qs.map((x, i) => (i === qIndex ? { ...x, answers: x.answers.filter((_, j) => j !== aIndex) } : x)))}
                              title={t("quizEd.removeAnswer")}
                              aria-label={t("quizEd.removeAnswer")}
                              className="icon-btn justify-self-end hover:bg-red-500/10 hover:text-red-600"
                            >
                              <FiX size={16} />
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                    <button
                      type="button"
                      onClick={() => setQuestions((qs) => qs.map((x, i) => (i === qIndex ? { ...x, answers: [...x.answers, newAnswer(defaultCategory)] } : x)))}
                      className="btn-ghost btn-sm mt-2 text-brand-700"
                    >
                      <FiPlus size={14} /> {t("quizEd.addAnswer")}
                    </button>
                  </div>
                </div>
              </section>
            ))
          )}
          <span id="quiz-end" />
        </div>

        <aside className="flex flex-col gap-6 lg:sticky lg:top-6">
          <Section title={t("quizEd.coverageTitle")} description={t("quizEd.coverageBody")} flush>
            {usedCategories.length === 0 ? (
              <p className="px-4 py-5 text-sm text-fg-muted sm:px-6">{t("quizEd.coverageEmpty")}</p>
            ) : (
              <ul className="divide-y divide-line">
                {usedCategories.map(([slug, answers]) => {
                  const n = covered.get(slug) ?? 0;
                  return (
                    <li key={slug} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm sm:px-6">
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-fg">{categoryName(slug)}</span>
                        <span className="text-xs text-fg-faint">{t("quizEd.answersCount", { n: answers })}</span>
                      </span>
                      {n > 0 ? (
                        <span className="shrink-0 text-xs font-medium text-emerald-700 dark:text-emerald-400">{t("quizEd.productsCount", { n })}</span>
                      ) : (
                        <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-400">
                          <FiAlertTriangle size={12} /> {t("quizEd.noProducts")}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Section>

          <Section title={t("quizEd.linkTitle")} description={savedPublished ? t("quizEd.linkBody") : t("quizEd.linkHidden")}>
            {savedPublished && <ShareLinkRow label={displayTitle} path={`/quiz/${baseline.slug}`} />}
            {savedPublished && isMain && <p className="mt-3 text-xs text-fg-faint">{t("quizEd.mainLinkNote")}</p>}
          </Section>

          <Section title={t("quizEd.howTitle")}>
            <ol className="flex list-decimal flex-col gap-1.5 pl-4 text-sm leading-relaxed text-fg-muted marker:text-fg-faint">
              <li>{t("quizEd.how1")}</li>
              <li>{t("quizEd.how2")}</li>
              <li>{t("quizEd.how3")}</li>
            </ol>
          </Section>
        </aside>
      </div>

      <UnsavedBar
        dirty={dirty}
        saving={saving}
        error={error}
        blockedReason={blockedReason}
        onSave={handleSave}
        onDiscard={() => {
          setForm(baseline);
          setError(false);
          setSlugTaken(false);
        }}
      />

      <ConfirmDialog
        open={pendingRemove !== null}
        title={t("quizEd.removeTitle", { n: (pendingRemove ?? 0) + 1 })}
        body={t("quizEd.removeBody")}
        confirmLabel={t("common.remove")}
        cancelLabel={t("common.cancel")}
        onConfirm={() => {
          const idx = pendingRemove;
          setQuestions((qs) => qs.filter((_, i) => i !== idx).map((q, i) => ({ ...q, order: i + 1 })));
          setPendingRemove(null);
        }}
        onCancel={() => setPendingRemove(null)}
      />

      <ConfirmDialog
        open={confirmDelete}
        title={t("quizList.deleteTitle", { name: localized(locale, baseline.title_mn, baseline.title_en) })}
        body={t("quizList.deleteBody")}
        confirmLabel={t("common.remove")}
        cancelLabel={t("common.cancel")}
        busy={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}
