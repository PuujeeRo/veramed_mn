"use client";

// One product's full editor — app/[locale]/dashboard/products/[productId].
//
// Layout: the form on the left in titled sections; on the right (sticky
// from lg up) what the product looks like and whether anyone can see it —
// visibility switch, a live preview tile, its public link, and the delete
// action. Every edit is local until saved; the UnsavedBar appears the
// moment anything differs from what's saved (Ctrl/Cmd+S saves, closing the
// tab with unsaved edits asks first).

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  FiAlertTriangle,
  FiCheck,
  FiCopy,
  FiExternalLink,
  FiEye,
  FiEyeOff,
  FiMoreHorizontal,
  FiPlus,
  FiTrash2,
} from "react-icons/fi";
import { MdQrCode2 } from "react-icons/md";
import { Category, PageTemplate, Product } from "@/lib/types";
import { getCategories } from "@/lib/categories";
import { TEMPLATES, DEFAULT_TEMPLATE } from "@/lib/templates";
import { ACCENTS, DEFAULT_ACCENT, ProductAccent, accentClass } from "@/lib/accents";
import { parseVideoUrl } from "@/lib/video";
import { onImageError } from "@/lib/media";
import { localized, useLanguage } from "@/lib/i18n";
import { useRouter } from "@/lib/navigation";
import { useOrigin } from "@/lib/useOrigin";
import ImageUploadField from "./ImageUploadField";
import RichTextEditor from "./RichTextEditor";
import ShareLinkRow from "./ShareLinkRow";
import TemplateThumb from "./TemplateThumb";
import { QrDialog } from "./QrCodeButton";
import PageHeader from "./ui/PageHeader";
import Section from "./ui/Section";
import Field from "./ui/Field";
import Switch from "./ui/Switch";
import StatusPill from "./ui/StatusPill";
import PriceInput from "./ui/PriceInput";
import Menu from "./ui/Menu";
import ConfirmDialog from "./ui/ConfirmDialog";
import UnsavedBar from "./ui/UnsavedBar";
import { useToast } from "./ui/Toast";
import { useFormState } from "./ui/useFormState";

const MAX_GALLERY = 6;

const isHttpUrl = (v: string) => v === "" || /^https?:\/\/\S+$/i.test(v);

function fromProduct(p: Product) {
  return {
    nameMn: p.name_mn,
    nameEn: p.name_en ?? "",
    price: p.price,
    imageUrl: p.imageUrl,
    galleryUrls: p.galleryUrls ?? [],
    descMn: p.description_mn,
    descEn: p.description_en ?? "",
    buyNowUrl: p.buyNowUrl ?? "",
    videoUrl: p.videoUrl ?? "",
    facebook: p.social?.facebook ?? "",
    instagram: p.social?.instagram ?? "",
    phone: p.contact?.phone ?? "",
    whatsapp: p.contact?.whatsapp ?? "",
    includeInQuiz: p.includeInQuiz,
    categories: p.categories,
    pageTemplate: (p.pageTemplate ?? DEFAULT_TEMPLATE) as PageTemplate,
    accent: (p.accent ?? DEFAULT_ACCENT) as ProductAccent,
    boostScore: p.boostScore,
    published: p.status === "active",
  };
}

export default function ProductEditor({ product }: { product: Product }) {
  const { locale, t } = useLanguage();
  const router = useRouter();
  const origin = useOrigin();
  const toast = useToast();
  const form = useFormState(fromProduct(product));
  const v = form.values;
  const set = form.set;

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [descLang, setDescLang] = useState<"mn" | "en">("mn");
  // RichTextEditor seeds itself once from initialHtml; bumping this key
  // remounts it so "Discard" visibly restores the saved text.
  const [editorKey, setEditorKey] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  // Whether the product is public as SAVED — the share link and "View
  // page" only work for that, not for an unsaved toggle.
  const [savedPublished, setSavedPublished] = useState(product.status === "active");

  // Fetched, never a static import — the manager edits this list on the
  // Categories section, and a stale copy here would offer ones that no
  // longer exist.
  const [categoryList, setCategoryList] = useState<Category[]>([]);
  useEffect(() => {
    getCategories().then(setCategoryList).catch(() => setCategoryList([]));
  }, []);

  const errors = {
    nameMn: !v.nameMn.trim() ? t("validation.required") : undefined,
    imageUrl: !v.imageUrl ? t("validation.imageRequired") : undefined,
    buyNowUrl: !isHttpUrl(v.buyNowUrl.trim()) ? t("validation.url") : undefined,
    videoUrl: !isHttpUrl(v.videoUrl.trim()) ? t("validation.url") : undefined,
    facebook: !isHttpUrl(v.facebook.trim()) ? t("validation.url") : undefined,
    instagram: !isHttpUrl(v.instagram.trim()) ? t("validation.url") : undefined,
  };
  const firstError = Object.values(errors).find(Boolean);

  const video = useMemo(() => (v.videoUrl.trim() ? parseVideoUrl(v.videoUrl.trim()) : null), [v.videoUrl]);
  const displayName = localized(locale, v.nameMn || product.name_mn, v.nameEn);
  const publicUrl = origin ? `${origin}/p/${product.id}` : `/p/${product.id}`;
  const quizReady = v.includeInQuiz && v.categories.length > 0;

  function toggleCategory(slug: string) {
    set("categories", v.categories.includes(slug) ? v.categories.filter((c) => c !== slug) : [...v.categories, slug]);
  }

  async function handleSave() {
    if (firstError) return;
    setSaving(true);
    setSaveError(false);
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name_mn: v.nameMn.trim(),
          name_en: v.nameEn.trim(),
          price: v.price,
          imageUrl: v.imageUrl,
          galleryUrls: v.galleryUrls.filter(Boolean),
          buyNowUrl: v.buyNowUrl.trim(),
          videoUrl: v.videoUrl.trim(),
          social: { facebook: v.facebook.trim(), instagram: v.instagram.trim() },
          contact: { phone: v.phone.trim(), whatsapp: v.whatsapp.trim() },
          description_mn: v.descMn,
          description_en: v.descEn,
          includeInQuiz: v.includeInQuiz,
          categories: v.categories,
          pageTemplate: v.pageTemplate,
          accent: v.accent,
          boostScore: v.boostScore,
          status: v.published ? "active" : "inactive",
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      form.commit({ ...v, galleryUrls: v.galleryUrls.filter(Boolean) });
      setSavedPublished(v.published);
      toast(t("common.saved"));
      router.refresh();
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  }

  function handleDiscard() {
    form.reset();
    setSaveError(false);
    setEditorKey((k) => k + 1);
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/products/${product.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      toast(t("prodEd.deleted"));
      // Nothing left to save — leaving must not trip the unsaved warning.
      form.commit(form.baseline);
      router.push("/dashboard?tab=products");
      router.refresh();
    } catch {
      toast(t("common.saveError"), "error");
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(publicUrl);
      toast(t("common.linkCopied"));
    } catch {
      toast(t("common.copyFailed"), "error");
    }
  }

  return (
    <>
      <PageHeader
        crumbs={[{ label: t("dash.tabProducts"), href: "/dashboard?tab=products" }, { label: displayName }]}
        title={displayName}
        meta={
          savedPublished ? (
            <StatusPill tone="success">{t("dash.statusPublished")}</StatusPill>
          ) : (
            <StatusPill tone="neutral">{t("dash.statusHidden")}</StatusPill>
          )
        }
        actions={
          <>
            {savedPublished && (
              <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary">
                <FiExternalLink size={15} /> {t("prodEd.viewPage")}
              </a>
            )}
            <Menu
              label={t("dash.moreActions")}
              triggerClassName="btn-secondary w-10 px-0"
              trigger={<FiMoreHorizontal size={18} />}
              items={[
                { label: t("common.copyLink"), icon: FiCopy, onSelect: copyLink, disabled: !savedPublished || !origin },
                { label: t("common.qrCode"), icon: MdQrCode2, onSelect: () => setQrOpen(true), disabled: !savedPublished || !origin },
                { label: t("prodEd.delete"), icon: FiTrash2, onSelect: () => setConfirmDelete(true), danger: true },
              ]}
            />
          </>
        }
      />

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_19rem] xl:grid-cols-[minmax(0,1fr)_21rem]">
        {/* ---------------- Form ---------------- */}
        <div className="flex min-w-0 flex-col gap-6">
          <Section title={t("prodEd.sectionBasic")} description={t("prodEd.sectionBasicBody")}>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label={t("prodEd.nameMnShort")} htmlFor="p-name-mn" required error={errors.nameMn}>
                <input id="p-name-mn" value={v.nameMn} onChange={(e) => set("nameMn", e.target.value)} maxLength={120} className={`field ${errors.nameMn ? "field-invalid" : ""}`} />
              </Field>
              <Field label={t("prodEd.nameEnShort")} htmlFor="p-name-en" meta={t("common.optional")}>
                <input id="p-name-en" value={v.nameEn} onChange={(e) => set("nameEn", e.target.value)} maxLength={120} className="field" />
              </Field>
              <Field label={t("prodEd.priceShort")} htmlFor="p-price" hint={t("prodEd.priceHint")}>
                <PriceInput id="p-price" value={v.price} onChange={(n) => set("price", n)} />
              </Field>
              <Field label={t("prodEd.buyNowUrl")} htmlFor="p-order" error={errors.buyNowUrl} hint={t("prodEd.buyNowHint")}>
                <input
                  id="p-order"
                  type="url"
                  inputMode="url"
                  value={v.buyNowUrl}
                  onChange={(e) => set("buyNowUrl", e.target.value)}
                  placeholder="https://m.me/…"
                  className={`field ${errors.buyNowUrl ? "field-invalid" : ""}`}
                />
              </Field>
            </div>
          </Section>

          <Section
            title={t("prodEd.sectionDescription")}
            description={t("prodEd.claimsHint")}
            aside={
              <div role="tablist" aria-label={t("prodEd.sectionDescription")} className="inline-flex rounded-lg bg-subtle p-0.5">
                {(["mn", "en"] as const).map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    role="tab"
                    aria-selected={descLang === lang}
                    onClick={() => setDescLang(lang)}
                    className={`h-8 rounded-md px-3 text-xs font-semibold transition ${
                      descLang === lang ? "bg-surface text-fg shadow-xs" : "text-fg-muted hover:text-fg"
                    }`}
                  >
                    {lang === "mn" ? t("lang.mn") : t("lang.en")}
                    {lang === "en" && !v.descEn && <span className="ml-1 font-normal text-fg-faint">· {t("common.optional")}</span>}
                  </button>
                ))}
              </div>
            }
          >
            {/* Both stay mounted so switching tabs keeps each editor's undo history. */}
            <div hidden={descLang !== "mn"}>
              <RichTextEditor key={`mn-${editorKey}`} initialHtml={v.descMn} onChangeHtml={(html) => set("descMn", html)} placeholder={t("prodEd.descPlaceholder")} />
            </div>
            <div hidden={descLang !== "en"}>
              <RichTextEditor key={`en-${editorKey}`} initialHtml={v.descEn} onChangeHtml={(html) => set("descEn", html)} placeholder={t("prodEd.descEnPlaceholder")} />
            </div>
          </Section>

          <Section title={t("prodEd.sectionMedia")} description={t("prodEd.mediaBody")}>
            <div className="grid grid-cols-2 gap-3 min-[480px]:grid-cols-3 xl:grid-cols-4">
              <ImageUploadField
                value={v.imageUrl}
                onChange={(url) => set("imageUrl", url)}
                label={t("prodEd.imageUrl")}
                badge={t("prodEd.cover")}
                invalid={Boolean(errors.imageUrl)}
              />
              {v.galleryUrls.map((url, i) => (
                <ImageUploadField
                  key={i}
                  value={url}
                  onChange={(next) => set("galleryUrls", v.galleryUrls.map((u, idx) => (idx === i ? next : u)))}
                  onRemove={() => set("galleryUrls", v.galleryUrls.filter((_, idx) => idx !== i))}
                  label={t("prodEd.galleryImageN", { n: i + 1 })}
                />
              ))}
              {v.galleryUrls.length < MAX_GALLERY && (
                <button
                  type="button"
                  onClick={() => set("galleryUrls", [...v.galleryUrls, ""])}
                  className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-line-strong text-sm font-medium text-fg-muted transition hover:border-brand-500 hover:bg-brand-50/50 hover:text-brand-700"
                >
                  <FiPlus size={18} />
                  {t("prodEd.addGalleryImage")}
                </button>
              )}
            </div>
            {errors.imageUrl && <p className="field-error">{errors.imageUrl}</p>}
            <p className="field-hint">{t("prodEd.galleryHint", { max: MAX_GALLERY })}</p>

            <div className="mt-6 border-t border-line pt-5">
              <Field
                label={t("prodEd.videoUrl")}
                htmlFor="p-video"
                meta={t("common.optional")}
                error={errors.videoUrl}
                hint={
                  video && video.platform !== "unknown" ? (
                    <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                      <FiCheck size={13} /> {t("prodEd.videoDetected", { platform: video.label })}
                    </span>
                  ) : v.videoUrl.trim() && !errors.videoUrl ? (
                    <span className="text-amber-700 dark:text-amber-400">{t("video.unsupported")}</span>
                  ) : (
                    t("prodEd.videoHint")
                  )
                }
              >
                <input
                  id="p-video"
                  type="url"
                  inputMode="url"
                  value={v.videoUrl}
                  onChange={(e) => set("videoUrl", e.target.value)}
                  placeholder="https://youtube.com/watch?v=…"
                  className={`field ${errors.videoUrl ? "field-invalid" : ""}`}
                />
              </Field>
            </div>
          </Section>

          <Section
            title={t("prodEd.sectionQuiz")}
            description={t("prodEd.quizBody")}
            aside={<Switch checked={v.includeInQuiz} onChange={(on) => set("includeInQuiz", on)} label={t("prodEd.includeInQuiz")} />}
          >
            <p className="field-label">{t("prodEd.categories")}</p>
            {categoryList.length === 0 ? (
              <div className="flex gap-2" aria-hidden="true">
                {[0, 1, 2, 3].map((i) => (
                  <span key={i} className="h-8 w-20 animate-pulse rounded-full bg-subtle" />
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {categoryList.map((c) => {
                  const on = v.categories.includes(c.slug);
                  return (
                    <button
                      key={c.slug}
                      type="button"
                      onClick={() => toggleCategory(c.slug)}
                      aria-pressed={on}
                      className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition active:scale-95 ${
                        on
                          ? "border-brand-600 bg-brand-600 text-white"
                          : "border-line bg-surface text-fg-muted hover:border-line-strong hover:text-fg"
                      }`}
                    >
                      {on && <FiCheck size={13} />}
                      {localized(locale, c.name_mn, c.name_en)}
                    </button>
                  );
                })}
              </div>
            )}
            {v.includeInQuiz && v.categories.length === 0 && (
              <p className="mt-3 flex items-start gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-300">
                <FiAlertTriangle size={15} className="mt-0.5 shrink-0" />
                {t("prodEd.noCategoryWarning")}
              </p>
            )}

            <div className={`mt-6 border-t border-line pt-5 ${v.includeInQuiz ? "" : "opacity-50"}`}>
              <Field
                label={t("prodEd.boost")}
                htmlFor="p-boost"
                meta={<span className="tabular-nums">{t("prodEd.boostValue", { value: v.boostScore })}</span>}
                hint={t("prodEd.boostHint")}
              >
                <input
                  id="p-boost"
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={v.boostScore}
                  disabled={!v.includeInQuiz}
                  onChange={(e) => set("boostScore", Number(e.target.value))}
                  className="h-2 w-full cursor-pointer accent-brand-600 disabled:cursor-not-allowed"
                />
              </Field>
            </div>
          </Section>

          <Section title={t("prodEd.sectionDesign")} description={t("prodEd.designBody")}>
            <p className="field-label">{t("prodEd.template")}</p>
            <div role="radiogroup" aria-label={t("prodEd.template")} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {TEMPLATES.map((tpl) => {
                const on = v.pageTemplate === tpl.id;
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => set("pageTemplate", tpl.id)}
                    className={`rounded-lg border p-2 text-left transition ${
                      on ? "border-brand-600 ring-2 ring-brand-500/20" : "border-line hover:border-line-strong"
                    }`}
                  >
                    <TemplateThumb id={tpl.id} accent={v.accent} />
                    <span className="mt-2 flex items-center justify-between gap-2 px-0.5 text-sm font-medium text-fg">
                      {t(tpl.nameKey)}
                      {on && <FiCheck size={14} className="shrink-0 text-brand-600" />}
                    </span>
                  </button>
                );
              })}
            </div>

            <p className="field-label mt-6">{t("prodEd.accent")}</p>
            <div role="radiogroup" aria-label={t("prodEd.accent")} className="flex flex-wrap gap-2">
              {ACCENTS.map((a) => {
                const on = v.accent === a.id;
                return (
                  <button
                    key={a.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => set("accent", a.id)}
                    className={`inline-flex h-9 items-center gap-2 rounded-full border pl-1.5 pr-3 text-sm font-medium transition ${
                      on ? "border-fg text-fg" : "border-line text-fg-muted hover:border-line-strong hover:text-fg"
                    }`}
                  >
                    <span aria-hidden="true" className={`${accentClass(a.id)} accent-swatch h-6 w-6 rounded-full`} />
                    {t(a.nameKey)}
                  </button>
                );
              })}
            </div>
            <p className="field-hint">{t("prodEd.accentHint")}</p>
          </Section>

          <Section title={t("prodEd.socialContact")} description={t("prodEd.socialContactBody")}>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label={t("prodEd.facebookUrl")} htmlFor="p-fb" error={errors.facebook}>
                <input id="p-fb" type="url" inputMode="url" value={v.facebook} onChange={(e) => set("facebook", e.target.value)} placeholder="https://facebook.com/…" className={`field ${errors.facebook ? "field-invalid" : ""}`} />
              </Field>
              <Field label={t("prodEd.instagramUrl")} htmlFor="p-ig" error={errors.instagram}>
                <input id="p-ig" type="url" inputMode="url" value={v.instagram} onChange={(e) => set("instagram", e.target.value)} placeholder="https://instagram.com/…" className={`field ${errors.instagram ? "field-invalid" : ""}`} />
              </Field>
              <Field label={t("prodEd.phone")} htmlFor="p-phone">
                <input id="p-phone" type="tel" inputMode="tel" value={v.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+976 …" className="field tabular-nums" />
              </Field>
              <Field label={t("prodEd.whatsapp")} htmlFor="p-wa">
                <input id="p-wa" type="tel" inputMode="tel" value={v.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} placeholder="+976 …" className="field tabular-nums" />
              </Field>
            </div>
          </Section>
        </div>

        {/* ---------------- Aside ---------------- */}
        <aside className="flex flex-col gap-6 lg:sticky lg:top-6">
          <Section
            title={t("prodEd.visibility")}
            aside={<Switch checked={v.published} onChange={(on) => set("published", on)} label={t("prodEd.publishToggle")} />}
          >
            <p className="flex items-start gap-2 text-sm leading-relaxed text-fg-muted">
              {v.published ? (
                <FiEye size={16} className="mt-0.5 shrink-0 text-emerald-600" />
              ) : (
                <FiEyeOff size={16} className="mt-0.5 shrink-0 text-fg-faint" />
              )}
              {t(v.published ? "prodEd.publishedBody" : "prodEd.hiddenBody")}
            </p>
            <dl className="mt-4 grid grid-cols-2 gap-2 border-t border-line pt-4 text-xs">
              <div>
                <dt className="text-fg-faint">{t("dash.colQuiz")}</dt>
                <dd className={`mt-0.5 font-medium ${quizReady ? "text-emerald-700 dark:text-emerald-400" : "text-fg-muted"}`}>
                  {quizReady ? t("dash.inQuiz") : t("dash.notInQuiz")}
                </dd>
              </div>
              <div>
                <dt className="text-fg-faint">{t("prodEd.buyNowUrl")}</dt>
                <dd className={`mt-0.5 font-medium ${v.buyNowUrl ? "text-fg" : "text-amber-700 dark:text-amber-400"}`}>
                  {v.buyNowUrl ? t("prodEd.orderSet") : t("prodEd.orderMissing")}
                </dd>
              </div>
            </dl>
          </Section>

          {/* Live preview — the catalog tile as visitors will see it. */}
          <div className="card overflow-hidden">
            <p className="eyebrow px-4 pt-4">{t("prodEd.preview")}</p>
            <div className="p-4">
              <div className="overflow-hidden rounded-xl border border-line">
                <div className={`${accentClass(v.accent)} accent-tile flex aspect-[4/3] items-center justify-center`}>
                  {v.imageUrl && (
                    <Image src={v.imageUrl} alt="" width={240} height={180} unoptimized onError={onImageError} className="h-full w-full object-contain p-4" />
                  )}
                </div>
                <div className="bg-surface p-3">
                  <p className="line-clamp-2 font-display text-sm font-semibold leading-snug text-fg">{displayName}</p>
                  <p className="mt-1 text-sm font-semibold tabular-nums text-brand-700">₮{v.price.toLocaleString("en-US")}</p>
                </div>
              </div>
            </div>
          </div>

          {savedPublished && (
            <Section title={t("prodEd.directLink")} description={t("prodEd.directLinkBody")}>
              <ShareLinkRow label={displayName} path={`/p/${product.id}`} />
            </Section>
          )}
        </aside>
      </div>

      <UnsavedBar
        dirty={form.dirty}
        saving={saving}
        error={saveError}
        blockedReason={firstError ? t("validation.fixErrors") : undefined}
        onSave={handleSave}
        onDiscard={handleDiscard}
      />

      <ConfirmDialog
        open={confirmDelete}
        title={t("prodEd.deleteTitle", { name: displayName })}
        body={t("prodEd.deleteBody")}
        confirmLabel={t("prodEd.deleteConfirm")}
        cancelLabel={t("common.cancel")}
        busy={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
      <QrDialog open={qrOpen} onClose={() => setQrOpen(false)} url={`${publicUrl}?src=qr`} label={displayName} />
    </>
  );
}
