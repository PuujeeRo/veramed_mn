"use client";

// The Quiz section's front page: every quiz the company runs, each with its
// own link (/quiz/{slug}), questions and products. Clicking a quiz opens its
// editor (`?tab=quiz&quiz={id}`, components/QuizEditor.tsx).
//
// The main quiz — the one /quiz itself opens, and the home page leads with
// — is the first published quiz in the list; "Make main" moves one to the
// top. A published quiz that can't recommend anything (no questions, or no
// published products) is flagged amber: visitors who open it see "not
// ready yet".

import { useState } from "react";
import {
  FiCopy,
  FiEdit2,
  FiExternalLink,
  FiEye,
  FiEyeOff,
  FiHelpCircle,
  FiMoreHorizontal,
  FiPlus,
  FiStar,
  FiTrash2,
} from "react-icons/fi";
import { MdQrCode2 } from "react-icons/md";
import { Brand, Product, Quiz } from "@/lib/types";
import { localized, useLanguage } from "@/lib/i18n";
import { Link, useRouter } from "@/lib/navigation";
import { useOrigin } from "@/lib/useOrigin";
import { isQuizReady, quizPool } from "@/lib/scoring";
import { QrDialog } from "./QrCodeButton";
import PageHeader from "./ui/PageHeader";
import EmptyState from "./ui/EmptyState";
import StatusPill from "./ui/StatusPill";
import Menu from "./ui/Menu";
import Drawer from "./ui/Drawer";
import Field from "./ui/Field";
import ConfirmDialog from "./ui/ConfirmDialog";
import Spinner from "./Spinner";
import { useToast } from "./ui/Toast";

interface QuizzesPanelProps {
  brand: Brand;
  quizzes: Quiz[];
  products: Product[];
  onCreated: (quiz: Quiz) => void;
  onChanged: (quiz: Quiz) => void;
  onMadeMain: (quiz: Quiz) => void;
  onDeleted: (quizId: string) => void;
}

export default function QuizzesPanel({ brand, quizzes, products, onCreated, onChanged, onMadeMain, onDeleted }: QuizzesPanelProps) {
  const { locale, t } = useLanguage();
  const router = useRouter();
  const origin = useOrigin();
  const toast = useToast();

  const [creating, setCreating] = useState(false);
  const [qrFor, setQrFor] = useState<Quiz | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Quiz | null>(null);
  const [deleting, setDeleting] = useState(false);

  const mainId = quizzes.find((q) => q.status === "active")?.id;
  const title = (q: Quiz) => localized(locale, q.title_mn, q.title_en);
  const editHref = (q: Quiz) => `/dashboard?tab=quiz&quiz=${q.id}`;
  // Public link — deliberately unprefixed (MN-canonical): a printed QR
  // code must not depend on the manager's current language.
  const publicUrl = (q: Quiz) => `${origin}/quiz/${q.slug}`;

  async function patch(q: Quiz, body: { status?: Quiz["status"]; main?: true }) {
    try {
      const res = await fetch(`/api/brands/${brand.id}/quizzes/${q.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      return ((await res.json()) as { quiz: Quiz }).quiz;
    } catch {
      toast(t("common.saveError"), "error");
      return null;
    }
  }

  async function setStatus(q: Quiz, status: Quiz["status"]) {
    const saved = await patch(q, { status });
    if (!saved) return;
    onChanged(saved);
    toast(t(status === "active" ? "quizList.publishedToast" : "quizList.hiddenToast"));
  }

  async function makeMain(q: Quiz) {
    const saved = await patch(q, { main: true });
    if (!saved) return;
    onMadeMain(saved);
    toast(t("quizList.madeMain"));
  }

  async function copyLink(q: Quiz) {
    try {
      await navigator.clipboard.writeText(publicUrl(q));
      toast(t("common.linkCopied"));
    } catch {
      toast(t("common.copyFailed"), "error");
    }
  }

  async function handleDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/brands/${brand.id}/quizzes/${pendingDelete.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      onDeleted(pendingDelete.id);
      toast(t("quizList.deleted"));
      setPendingDelete(null);
    } catch {
      toast(t("common.saveError"), "error");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <PageHeader
        title={t("dash.tabQuiz")}
        description={t("dash.descQuiz")}
        actions={
          <button type="button" onClick={() => setCreating(true)} className="btn-primary">
            <FiPlus size={16} /> {t("quizList.add")}
          </button>
        }
      />

      {quizzes.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={FiHelpCircle}
            title={t("quizList.emptyTitle")}
            body={t("quizList.emptyBody")}
            action={
              <button type="button" onClick={() => setCreating(true)} className="btn-primary">
                <FiPlus size={16} /> {t("quizList.add")}
              </button>
            }
          />
        </div>
      ) : (
        <ul className="card divide-y divide-line overflow-hidden">
          {quizzes.map((q) => {
            const published = q.status === "active";
            const pool = quizPool(q, products).length;
            return (
              <li key={q.id} className="flex items-start gap-3 px-4 py-4 sm:items-center sm:px-6">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                    <Link href={editHref(q)} className="min-w-0 font-medium text-fg hover:text-brand-700">
                      {title(q)}
                    </Link>
                    {q.id === mainId && (
                      <StatusPill tone="brand" dot={false}>
                        <span title={t("quizList.mainHint")} className="inline-flex items-center gap-1">
                          <FiStar size={11} /> {t("quizList.main")}
                        </span>
                      </StatusPill>
                    )}
                    {published ? (
                      isQuizReady(q, products) ? (
                        <StatusPill tone="success">{t("dash.statusPublished")}</StatusPill>
                      ) : (
                        <StatusPill tone="warning">{t("quizList.notReady")}</StatusPill>
                      )
                    ) : (
                      <StatusPill tone="neutral">{t("dash.statusHidden")}</StatusPill>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-fg-muted">
                    <span className="break-all font-mono text-xs text-fg-faint">/quiz/{q.slug}</span>
                    <span aria-hidden="true" className="mx-1.5 text-fg-faint">·</span>
                    {t("quizList.questions", { n: q.questions.length })}
                    <span aria-hidden="true" className="mx-1.5 text-fg-faint">·</span>
                    {t("quizList.products", { n: pool })}
                  </p>
                </div>

                <Link href={editHref(q)} className="btn-secondary btn-sm hidden shrink-0 sm:inline-flex">
                  <FiEdit2 size={14} /> {t("dash.edit")}
                </Link>
                <Menu
                  label={t("dash.moreActions")}
                  trigger={<FiMoreHorizontal size={18} />}
                  items={[
                    { label: t("dash.edit"), icon: FiEdit2, onSelect: () => router.push(editHref(q)) },
                    {
                      label: t("quizList.open"),
                      icon: FiExternalLink,
                      onSelect: () => window.open(publicUrl(q), "_blank", "noopener"),
                      disabled: !published || !origin,
                    },
                    { label: t("common.copyLink"), icon: FiCopy, onSelect: () => copyLink(q), disabled: !published || !origin },
                    { label: t("common.qrCode"), icon: MdQrCode2, onSelect: () => setQrFor(q), disabled: !published || !origin },
                    published
                      ? { label: t("quizList.hide"), icon: FiEyeOff, onSelect: () => setStatus(q, "inactive") }
                      : { label: t("quizList.publish"), icon: FiEye, onSelect: () => setStatus(q, "active") },
                    { label: t("quizList.makeMain"), icon: FiStar, onSelect: () => makeMain(q), disabled: q.id === mainId },
                    { label: t("common.remove"), icon: FiTrash2, onSelect: () => setPendingDelete(q), danger: true },
                  ]}
                />
              </li>
            );
          })}
        </ul>
      )}

      <CreateQuizForm
        brand={brand}
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(quiz) => {
          onCreated(quiz);
          setCreating(false);
          router.push(editHref(quiz));
        }}
      />

      <QrDialog
        open={qrFor !== null}
        onClose={() => setQrFor(null)}
        url={qrFor ? `${publicUrl(qrFor)}?src=qr` : ""}
        label={qrFor ? title(qrFor) : ""}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        title={t("quizList.deleteTitle", { name: pendingDelete ? title(pendingDelete) : "" })}
        body={t("quizList.deleteBody")}
        confirmLabel={t("common.remove")}
        cancelLabel={t("common.cancel")}
        busy={deleting}
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}

/** A new quiz needs only a title to exist; it starts hidden, and the editor
 *  it opens into is where questions and products go. */
function CreateQuizForm({
  brand,
  open,
  onClose,
  onCreated,
}: {
  brand: Brand;
  open: boolean;
  onClose: () => void;
  onCreated: (quiz: Quiz) => void;
}) {
  const { t } = useLanguage();
  const [titleMn, setTitleMn] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [touched, setTouched] = useState(false);

  const missing = !titleMn.trim();

  function close() {
    if (busy) return;
    setTitleMn("");
    setTitleEn("");
    setTouched(false);
    setError(false);
    onClose();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (missing) return;
    setBusy(true);
    setError(false);
    try {
      const res = await fetch(`/api/brands/${brand.id}/quizzes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title_mn: titleMn.trim(), title_en: titleEn.trim() }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { quiz } = (await res.json()) as { quiz: Quiz };
      setTitleMn("");
      setTitleEn("");
      setTouched(false);
      onCreated(quiz);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Drawer
      open={open}
      onClose={close}
      title={t("quizList.createTitle")}
      description={t("quizList.createHint")}
      closeLabel={t("common.close")}
      footer={
        <>
          <button type="button" onClick={close} disabled={busy} className="btn-ghost">
            {t("common.cancel")}
          </button>
          <button type="submit" form="create-quiz" disabled={busy} className="btn-primary">
            {busy ? <Spinner className="h-4 w-4 text-white" /> : <FiPlus size={16} />}
            {t("quizList.create")}
          </button>
        </>
      }
    >
      <form id="create-quiz" onSubmit={submit} noValidate className="flex flex-col gap-5">
        <Field
          label={t("quizEd.titleMn")}
          htmlFor="new-quiz-mn"
          required
          hint={t("quizEd.titleHint")}
          error={touched && missing ? t("validation.required") : undefined}
        >
          <input
            id="new-quiz-mn"
            value={titleMn}
            onChange={(e) => setTitleMn(e.target.value)}
            className={`field ${touched && missing ? "field-invalid" : ""}`}
          />
        </Field>
        <Field label={t("quizEd.titleEn")} htmlFor="new-quiz-en">
          <input id="new-quiz-en" value={titleEn} onChange={(e) => setTitleEn(e.target.value)} className="field" />
        </Field>
        {error && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {t("common.saveError")}
          </p>
        )}
      </form>
    </Drawer>
  );
}
