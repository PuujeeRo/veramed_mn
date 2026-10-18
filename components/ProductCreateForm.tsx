"use client";

// "Add product" as a slide-over panel. Collects only what a product needs
// to exist (app/api/brands/[brandId]/products); everything else —
// gallery, categories, order link, page layout — is filled in on the full
// editor, which opens right after. The new product starts hidden, so a
// half-finished page is never public.

import { useState } from "react";
import { FiPlus } from "react-icons/fi";
import { COMPANY_ID } from "@/lib/company";
import { ProductRow, toProduct } from "@/lib/data";
import { Product } from "@/lib/types";
import { useLanguage } from "@/lib/i18n";
import ImageUploadField from "./ImageUploadField";
import Spinner from "./Spinner";
import Drawer from "./ui/Drawer";
import Field from "./ui/Field";
import PriceInput from "./ui/PriceInput";

interface ProductCreateFormProps {
  open: boolean;
  onClose: () => void;
  onCreated: (product: Product) => void;
}

const EMPTY = { nameMn: "", descMn: "", price: 0, imageUrl: "" };

export default function ProductCreateForm({ open, onClose, onCreated }: ProductCreateFormProps) {
  const { t } = useLanguage();
  const [form, setForm] = useState(EMPTY);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(false);
  // Field errors only show after the first submit attempt — not while the
  // manager is still typing the form for the first time.
  const [tried, setTried] = useState(false);

  const missing = {
    imageUrl: !form.imageUrl,
    nameMn: !form.nameMn.trim(),
    descMn: !form.descMn.trim(),
  };
  const valid = !missing.imageUrl && !missing.nameMn && !missing.descMn;

  function close() {
    if (creating) return;
    setForm(EMPTY);
    setTried(false);
    setError(false);
    onClose();
  }

  async function handleCreate(e?: React.FormEvent) {
    e?.preventDefault();
    setTried(true);
    if (!valid) return;
    setCreating(true);
    setError(false);
    try {
      const res = await fetch(`/api/brands/${COMPANY_ID}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name_mn: form.nameMn.trim(), description_mn: form.descMn.trim(), price: form.price, imageUrl: form.imageUrl }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { product } = (await res.json()) as { product: ProductRow };
      setForm(EMPTY);
      setTried(false);
      onCreated(toProduct(product));
    } catch {
      setError(true);
    } finally {
      setCreating(false);
    }
  }

  return (
    <Drawer
      open={open}
      onClose={close}
      title={t("dash.addProductTitle")}
      description={t("dash.addProductHint")}
      closeLabel={t("common.close")}
      footer={
        <>
          <button type="button" onClick={close} disabled={creating} className="btn-ghost">
            {t("common.cancel")}
          </button>
          <button type="submit" form="create-product" disabled={creating} className="btn-primary">
            {creating ? <Spinner className="h-4 w-4 text-white" /> : <FiPlus size={16} />}
            {creating ? t("prodEd.creating") : t("prodEd.create")}
          </button>
        </>
      }
    >
      <form id="create-product" onSubmit={handleCreate} noValidate className="flex flex-col gap-5">
        <div>
          <p className="field-label">
            {t("prodEd.imageUrl")}
            <span aria-hidden="true" className="ml-0.5 text-brand-600">*</span>
          </p>
          <div className="w-40">
            <ImageUploadField
              value={form.imageUrl}
              onChange={(imageUrl) => setForm((f) => ({ ...f, imageUrl }))}
              label={t("prodEd.imageUrl")}
              invalid={tried && missing.imageUrl}
            />
          </div>
          {tried && missing.imageUrl && <p className="field-error">{t("validation.imageRequired")}</p>}
        </div>

        <Field label={t("prodEd.nameMnShort")} htmlFor="new-name" required error={tried && missing.nameMn ? t("validation.required") : undefined}>
          <input
            id="new-name"
            value={form.nameMn}
            onChange={(e) => setForm((f) => ({ ...f, nameMn: e.target.value }))}
            className={`field ${tried && missing.nameMn ? "field-invalid" : ""}`}
            maxLength={120}
          />
        </Field>

        <Field label={t("prodEd.priceShort")} htmlFor="new-price" hint={t("prodEd.priceHint")}>
          <PriceInput id="new-price" value={form.price} onChange={(price) => setForm((f) => ({ ...f, price }))} />
        </Field>

        <Field
          label={t("prodEd.descMnPlain")}
          htmlFor="new-desc"
          required
          meta={`${form.descMn.length}/500`}
          error={tried && missing.descMn ? t("validation.required") : undefined}
          hint={t("prodEd.descShortHint")}
        >
          <textarea
            id="new-desc"
            value={form.descMn}
            onChange={(e) => setForm((f) => ({ ...f, descMn: e.target.value.slice(0, 500) }))}
            rows={4}
            className={`field ${tried && missing.descMn ? "field-invalid" : ""}`}
          />
        </Field>

        {error && (
          <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
            {t("common.saveError")}
          </p>
        )}
      </form>
    </Drawer>
  );
}
