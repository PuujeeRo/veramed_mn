"use client";

// The Site content section — everything about the company the public site
// shows that isn't a product or the quiz: name, logo, tagline, the About
// text, and contact details. One save for all of it (they are columns of
// the same row), through the same UnsavedBar as every other editor.
//
// Bilingual rule as everywhere: MN is what visitors see by default, EN is
// optional and falls back to MN.

import { useState } from "react";
import Image from "next/image";
import { FiExternalLink, FiFacebook, FiInstagram, FiMail, FiMapPin, FiPhone } from "react-icons/fi";
import { Brand } from "@/lib/types";
import { localized, useLanguage } from "@/lib/i18n";
import { messengerUrl } from "@/lib/contact";
import { onImageError } from "@/lib/media";
import { Link, useRouter } from "@/lib/navigation";
import ImageUploadField from "./ImageUploadField";
import RichTextEditor from "./RichTextEditor";
import PageHeader from "./ui/PageHeader";
import Section from "./ui/Section";
import Field from "./ui/Field";
import UnsavedBar from "./ui/UnsavedBar";
import { useToast } from "./ui/Toast";
import { useFormState } from "./ui/useFormState";

const isHttpUrl = (v: string) => v === "" || /^https?:\/\/\S+$/i.test(v);
const isEmail = (v: string) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

function fromBrand(brand: Brand) {
  return {
    name: brand.name,
    logoUrl: brand.logoUrl,
    taglineMn: brand.quizIntro_mn,
    taglineEn: brand.quizIntro_en ?? "",
    aboutMn: brand.about_mn ?? "",
    aboutEn: brand.about_en ?? "",
    phone: brand.contact?.phone ?? "",
    email: brand.contact?.email ?? "",
    address: brand.contact?.address ?? "",
    facebook: brand.contact?.facebook ?? "",
    instagram: brand.contact?.instagram ?? "",
  };
}

export default function SiteContentEditor({ brand }: { brand: Brand }) {
  const { locale, t } = useLanguage();
  const router = useRouter();
  const toast = useToast();
  const form = useFormState(fromBrand(brand));
  const v = form.values;
  const set = form.set;
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [aboutLang, setAboutLang] = useState<"mn" | "en">("mn");
  const [editorKey, setEditorKey] = useState(0);

  const errors = {
    name: !v.name.trim() ? t("validation.required") : undefined,
    logoUrl: !v.logoUrl ? t("validation.imageRequired") : undefined,
    taglineMn: !v.taglineMn.trim() ? t("validation.required") : undefined,
    email: !isEmail(v.email.trim()) ? t("validation.email") : undefined,
    facebook: !isHttpUrl(v.facebook.trim()) ? t("validation.url") : undefined,
    instagram: !isHttpUrl(v.instagram.trim()) ? t("validation.url") : undefined,
  };
  const firstError = Object.values(errors).find(Boolean);
  const messenger = messengerUrl(v.facebook.trim() || undefined);

  async function handleSave() {
    if (firstError) return;
    setSaving(true);
    setSaveError(false);
    try {
      const res = await fetch(`/api/brands/${brand.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: v.name.trim(),
          logoUrl: v.logoUrl,
          taglineMn: v.taglineMn.trim(),
          taglineEn: v.taglineEn.trim() || undefined,
          aboutMn: v.aboutMn || undefined,
          aboutEn: v.aboutEn || undefined,
          contact: {
            phone: v.phone.trim(),
            email: v.email.trim(),
            address: v.address.trim(),
            facebook: v.facebook.trim(),
            instagram: v.instagram.trim(),
          },
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      form.commit();
      toast(t("common.saved"));
      router.refresh();
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title={t("dash.tabSite")}
        description={t("dash.descSite")}
        actions={
          <Link href="/" target="_blank" className="btn-secondary">
            <FiExternalLink size={15} /> {t("brandEd.preview")}
          </Link>
        }
      />

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <Section title={t("siteEd.identityTitle")} description={t("siteEd.identityBody")}>
            <div className="grid gap-5 sm:grid-cols-[9rem_minmax(0,1fr)] sm:items-start">
              <div>
                <p className="field-label">{t("siteEd.logo")}</p>
                <ImageUploadField value={v.logoUrl} onChange={(url) => set("logoUrl", url)} label={t("siteEd.logo")} invalid={Boolean(errors.logoUrl)} />
                {errors.logoUrl && <p className="field-error">{errors.logoUrl}</p>}
              </div>
              <div className="flex flex-col gap-5">
                <Field label={t("siteEd.name")} htmlFor="s-name" required error={errors.name}>
                  <input id="s-name" value={v.name} onChange={(e) => set("name", e.target.value)} maxLength={80} className={`field ${errors.name ? "field-invalid" : ""}`} />
                </Field>
                <Field label={t("brandEd.taglineTitle")} htmlFor="s-tag-mn" required error={errors.taglineMn} hint={t("brandEd.taglineBody")} meta={`${v.taglineMn.length}/120`}>
                  <input id="s-tag-mn" value={v.taglineMn} onChange={(e) => set("taglineMn", e.target.value.slice(0, 120))} className={`field ${errors.taglineMn ? "field-invalid" : ""}`} />
                </Field>
                <Field label={t("siteEd.taglineEn")} htmlFor="s-tag-en" meta={t("common.optional")}>
                  <input id="s-tag-en" value={v.taglineEn} onChange={(e) => set("taglineEn", e.target.value.slice(0, 120))} className="field" />
                </Field>
              </div>
            </div>
          </Section>

          <Section
            title={t("brandEd.aboutTitle")}
            description={t("brandEd.aboutBody")}
            aside={
              <div role="tablist" aria-label={t("brandEd.aboutTitle")} className="inline-flex rounded-lg bg-subtle p-0.5">
                {(["mn", "en"] as const).map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    role="tab"
                    aria-selected={aboutLang === lang}
                    onClick={() => setAboutLang(lang)}
                    className={`h-8 rounded-md px-3 text-xs font-semibold transition ${aboutLang === lang ? "bg-surface text-fg shadow-xs" : "text-fg-muted hover:text-fg"}`}
                  >
                    {lang === "mn" ? t("lang.mn") : t("lang.en")}
                  </button>
                ))}
              </div>
            }
          >
            <div hidden={aboutLang !== "mn"}>
              <RichTextEditor key={`mn-${editorKey}`} initialHtml={v.aboutMn} onChangeHtml={(html) => set("aboutMn", html)} placeholder={t("brandEd.aboutPlaceholder")} />
            </div>
            <div hidden={aboutLang !== "en"}>
              <RichTextEditor key={`en-${editorKey}`} initialHtml={v.aboutEn} onChangeHtml={(html) => set("aboutEn", html)} placeholder={t("brandEd.aboutPlaceholderEn")} />
            </div>
          </Section>

          <Section title={t("siteEd.contactTitle")} description={t("siteEd.contactBody")}>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label={t("prodEd.phone")} htmlFor="s-phone">
                <input id="s-phone" type="tel" inputMode="tel" value={v.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+976 …" className="field tabular-nums" />
              </Field>
              <Field label={t("contact.email")} htmlFor="s-email" error={errors.email}>
                <input id="s-email" type="email" inputMode="email" value={v.email} onChange={(e) => set("email", e.target.value)} placeholder="info@…" className={`field ${errors.email ? "field-invalid" : ""}`} />
              </Field>
              <Field label={t("contact.address")} htmlFor="s-address" className="sm:col-span-2">
                <input id="s-address" value={v.address} onChange={(e) => set("address", e.target.value)} className="field" />
              </Field>
              <Field
                label={t("prodEd.facebookUrl")}
                htmlFor="s-fb"
                error={errors.facebook}
                hint={messenger ? t("siteEd.messengerDetected", { url: messenger.replace("https://", "") }) : undefined}
              >
                <input id="s-fb" type="url" inputMode="url" value={v.facebook} onChange={(e) => set("facebook", e.target.value)} placeholder="https://facebook.com/…" className={`field ${errors.facebook ? "field-invalid" : ""}`} />
              </Field>
              <Field label={t("prodEd.instagramUrl")} htmlFor="s-ig" error={errors.instagram}>
                <input id="s-ig" type="url" inputMode="url" value={v.instagram} onChange={(e) => set("instagram", e.target.value)} placeholder="https://instagram.com/…" className={`field ${errors.instagram ? "field-invalid" : ""}`} />
              </Field>
            </div>
          </Section>
        </div>

        {/* Live preview of where this shows up. */}
        <aside className="flex flex-col gap-6 lg:sticky lg:top-6">
          <div className="card overflow-hidden">
            <p className="eyebrow px-4 pt-4">{t("prodEd.preview")}</p>
            <div className="m-4 overflow-hidden rounded-xl border border-line">
              <div className="brand-gradient h-1" />
              <div className="flex items-center gap-2 border-b border-line px-3 py-2.5">
                {v.logoUrl && <Image src={v.logoUrl} alt="" width={24} height={24} unoptimized onError={onImageError} className="h-6 w-6 object-contain" />}
                <span className="truncate font-display text-sm font-semibold text-fg">{v.name || "—"}</span>
              </div>
              <div className="px-3 py-4">
                <p className="font-display text-base font-semibold leading-snug tracking-tight text-fg">
                  {localized(locale, v.taglineMn || "—", v.taglineEn)}
                </p>
                <span className="mt-3 inline-flex h-7 items-center rounded-full bg-brand-600 px-3 text-xs font-medium text-white">
                  {t("quiz.start")}
                </span>
              </div>
            </div>
          </div>

          <Section title={t("siteEd.contactPreview")} flush>
            <ul className="divide-y divide-line text-sm">
              {[
                { icon: FiPhone, value: v.phone },
                { icon: FiMail, value: v.email },
                { icon: FiMapPin, value: v.address },
                { icon: FiFacebook, value: v.facebook && "Facebook" },
                { icon: FiInstagram, value: v.instagram && "Instagram" },
              ].map(({ icon: Icon, value }, i) => (
                <li key={i} className={`flex items-center gap-2.5 px-4 py-2.5 sm:px-6 ${value ? "text-fg" : "text-fg-faint"}`}>
                  <Icon size={14} className="shrink-0" />
                  <span className="truncate">{value || t("siteEd.notSet")}</span>
                </li>
              ))}
            </ul>
          </Section>
        </aside>
      </div>

      <UnsavedBar
        dirty={form.dirty}
        saving={saving}
        error={saveError}
        blockedReason={firstError ? t("validation.fixErrors") : undefined}
        onSave={handleSave}
        onDiscard={() => {
          form.reset();
          setSaveError(false);
          setEditorKey((k) => k + 1);
        }}
      />
    </>
  );
}
