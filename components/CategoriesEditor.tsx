"use client";

// The Categories section â€” what products are tagged with and what quiz
// answers add points to. The whole list is edited locally, then saved in
// one call (PUT /api/brands/[id]/categories via lib/categories.ts).
//
// Each row shows where the category is used (products, quiz answers), so
// renaming a code or removing a row â€” which disconnects those â€” is never a
// blind action. A used category asks for confirmation before it goes.

import { useEffect, useMemo, useState } from "react";
import { FiAlertTriangle, FiPlus, FiSearch, FiTag, FiTrash2 } from "react-icons/fi";
import { Category, Product, QuizQuestion } from "@/lib/types";
import { getCategories, saveCategories } from "@/lib/categories";
import { slugify } from "@/lib/slug";
import { useLanguage } from "@/lib/i18n";
import PageHeader from "./ui/PageHeader";
import EmptyState from "./ui/EmptyState";
import ConfirmDialog from "./ui/ConfirmDialog";
import UnsavedBar from "./ui/UnsavedBar";
import { useToast } from "./ui/Toast";

interface CategoriesEditorProps {
  products: Product[];
  questions: QuizQuestion[];
}

function newCategory(): Category {
  return { id: `new_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, slug: "", name_mn: "", name_en: "" };
}

export default function CategoriesEditor({ products, questions }: CategoriesEditorProps) {
  const { t } = useLanguage();
  const toast = useToast();
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [baseline, setBaseline] = useState<Category[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [pendingRemove, setPendingRemove] = useState<Category | null>(null);
  // Rows whose code the manager typed by hand â€” never overwritten by the
  // auto-fill from the Mongolian name again.
  const [touchedSlug, setTouchedSlug] = useState<Set<string>>(new Set());

  useEffect(() => {
    getCategories()
      .then((cats) => {
        setBaseline(cats);
        setCategories(cats);
        setLoaded(true);
      })
      .catch(() => setLoadError(true));
  }, []);

  const usage = useMemo(() => {
    const map = new Map<string, { products: number; answers: number }>();
    for (const c of categories) {
      map.set(c.slug, {
        products: products.filter((p) => p.categories.includes(c.slug)).length,
        answers: questions.reduce((n, q) => n + q.answers.filter((a) => a.category === c.slug).length, 0),
      });
    }
    return map;
  }, [categories, products, questions]);

  const dirty = JSON.stringify(categories) !== JSON.stringify(baseline);
  const slugs = categories.map((c) => c.slug.trim());
  const duplicate = (slug: string) => slug !== "" && slugs.filter((s) => s === slug).length > 1;
  const incomplete = categories.some((c) => !c.name_mn.trim() || !c.slug.trim());
  const hasDuplicate = categories.some((c) => duplicate(c.slug.trim()));
  const blockedReason = incomplete ? t("dashCat.incomplete") : hasDuplicate ? t("dashCat.slugTaken") : undefined;

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((c) => `${c.name_mn} ${c.name_en} ${c.slug}`.toLowerCase().includes(q));
  }, [categories, search]);

  function update(id: string, patch: Partial<Category>) {
    setCategories((cats) => cats.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  function updateNameMn(id: string, value: string) {
    setCategories((cats) =>
      cats.map((c) => {
        if (c.id !== id) return c;
        // New rows only: the code follows the name until typed by hand.
        const auto = c.id.startsWith("new_") && !touchedSlug.has(id);
        return { ...c, name_mn: value, slug: auto ? slugify(value) : c.slug };
      })
    );
  }

  function remove(c: Category) {
    const u = usage.get(c.slug);
    if (u && (u.products > 0 || u.answers > 0)) setPendingRemove(c);
    else setCategories((cats) => cats.filter((x) => x.id !== c.id));
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    try {
      const saved = await saveCategories(categories.map((c) => ({ ...c, slug: c.slug.trim(), name_mn: c.name_mn.trim(), name_en: c.name_en.trim() })));
      setBaseline(saved);
      setCategories(saved);
      setTouchedSlug(new Set());
      toast(t("common.saved"));
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      setSaveError(message.includes("slug_taken") ? t("dashCat.slugTaken") : t("common.saveError"));
    } finally {
      setSaving(false);
    }
  }

  const addButton = (
    <button type="button" onClick={() => setCategories((cats) => [...cats, newCategory()])} className="btn-primary">
      <FiPlus size={16} /> {t("dashCat.add")}
    </button>
  );

  return (
    <>
      <PageHeader title={t("dashCat.title")} description={t("dashCat.body")} actions={loaded && addButton} />

      <div className="card overflow-hidden">
        {loadError ? (
          <p className="px-5 py-10 text-center text-sm text-red-600">{t("common.loadError")}</p>
        ) : !loaded ? (
          <div className="divide-y divide-line" aria-hidden="true">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="flex gap-3 px-5 py-3">
                <span className="h-9 flex-1 animate-pulse rounded-md bg-subtle" />
                <span className="h-9 flex-1 animate-pulse rounded-md bg-subtle" />
                <span className="h-9 w-32 animate-pulse rounded-md bg-subtle" />
              </div>
            ))}
          </div>
        ) : categories.length === 0 ? (
          <EmptyState icon={FiTag} title={t("dashCat.emptyTitle")} body={t("dashCat.empty")} action={addButton} />
        ) : (
          <>
            {categories.length > 8 && (
              <div className="border-b border-line p-3 sm:px-5">
                <div className="relative">
                  <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-faint" size={15} />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t("dashCat.search")}
                    aria-label={t("dashCat.search")}
                    className="field pl-9"
                  />
                </div>
              </div>
            )}

            <div className="hidden grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,0.8fr)_11.5rem_2.5rem] gap-3 border-b border-line bg-subtle/50 px-5 py-2.5 text-xs font-medium text-fg-muted md:grid">
              <span>{t("dashCat.nameMn")}</span>
              <span>{t("dashCat.nameEn")}</span>
              <span>{t("dashCat.slug")}</span>
              <span>{t("dashCat.usedBy")}</span>
              <span className="sr-only">{t("common.remove")}</span>
            </div>

            <ul className="divide-y divide-line">
              {visible.map((c) => {
                const u = usage.get(c.slug) ?? { products: 0, answers: 0 };
                const dup = duplicate(c.slug.trim());
                return (
                  <li
                    key={c.id}
                    className="grid grid-cols-1 gap-2 px-4 py-3 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,0.8fr)_11.5rem_2.5rem] md:items-center md:gap-3 md:px-5"
                  >
                    <input
                      value={c.name_mn}
                      onChange={(e) => updateNameMn(c.id, e.target.value)}
                      placeholder={t("dashCat.nameMn")}
                      aria-label={t("dashCat.nameMn")}
                      className={`field field-sm ${!c.name_mn.trim() ? "field-invalid" : ""}`}
                    />
                    <input
                      value={c.name_en}
                      onChange={(e) => update(c.id, { name_en: e.target.value })}
                      placeholder={t("dashCat.nameEn")}
                      aria-label={t("dashCat.nameEn")}
                      className="field field-sm"
                    />
                    <input
                      value={c.slug}
                      onChange={(e) => {
                        setTouchedSlug((s) => new Set(s).add(c.id));
                        update(c.id, { slug: e.target.value.toLowerCase() });
                      }}
                      placeholder="energy"
                      aria-label={t("dashCat.slug")}
                      aria-invalid={dup || !c.slug.trim() || undefined}
                      className={`field field-sm font-mono text-[0.8125rem] ${dup || !c.slug.trim() ? "field-invalid" : ""}`}
                    />
                    <span className="text-xs text-fg-muted">
                      {u.products === 0 && u.answers === 0 ? (
                        <span className="text-fg-faint">{t("dashCat.unused")}</span>
                      ) : (
                        t("dashCat.usage", { products: u.products, answers: u.answers })
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => remove(c)}
                      title={t("common.remove")}
                      aria-label={`${t("common.remove")}: ${c.name_mn || c.slug}`}
                      className="icon-btn justify-self-end hover:bg-red-500/10 hover:text-red-600"
                    >
                      <FiTrash2 size={16} />
                    </button>
                  </li>
                );
              })}
            </ul>
            {visible.length === 0 && <p className="px-5 py-8 text-center text-sm text-fg-muted">{t("common.noSearchResults")}</p>}

            <p className="flex items-start gap-2 border-t border-line bg-subtle/40 px-5 py-3 text-xs leading-relaxed text-fg-muted">
              <FiAlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-500" />
              {t("dashCat.slugWarning")}
            </p>
          </>
        )}
      </div>

      <UnsavedBar
        dirty={dirty}
        saving={saving}
        error={Boolean(saveError)}
        blockedReason={blockedReason}
        onSave={handleSave}
        onDiscard={() => {
          setCategories(baseline);
          setSaveError(null);
          setTouchedSlug(new Set());
        }}
      />

      <ConfirmDialog
        open={pendingRemove !== null}
        title={t("dashCat.removeTitle", { name: pendingRemove?.name_mn ?? "" })}
        body={
          pendingRemove
            ? t("dashCat.removeBody", {
                products: usage.get(pendingRemove.slug)?.products ?? 0,
                answers: usage.get(pendingRemove.slug)?.answers ?? 0,
              })
            : ""
        }
        confirmLabel={t("common.remove")}
        cancelLabel={t("common.cancel")}
        onConfirm={() => {
          const id = pendingRemove?.id;
          setCategories((cats) => cats.filter((x) => x.id !== id));
          setPendingRemove(null);
        }}
        onCancel={() => setPendingRemove(null)}
      />
    </>
  );
}
