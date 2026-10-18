// veramed — the category taxonomy products are tagged with and quiz answers
// add points to. All of it belongs to the company and is editable from the
// dashboard's Products tab (CategoriesPanel); there is no separate
// admin-owned list.
//
// Reads use the public anon client (categories are shown to visitors on the
// catalog filter and the quiz result). Writes go through
// PUT /api/brands/{id}/categories, which replaces the whole list.

import { supabase } from "./supabase";
import { COMPANY_ID, isSupabaseConfigured } from "./company";
import { Category } from "./types";
import seed from "@/supabase/seed.json";

type CategoryRow = { id: string; slug: string; name_mn: string; name_en: string | null };

function toCategory(row: CategoryRow): Category {
  return { id: row.id, slug: row.slug, name_mn: row.name_mn, name_en: row.name_en ?? "" };
}

export async function getCategories(): Promise<Category[]> {
  if (!isSupabaseConfigured()) {
    return seed.categories.map((c) => ({ id: c.slug, ...c }));
  }
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("brand_id", COMPANY_ID)
    .order("slug");
  if (error) throw error;
  return (data as CategoryRow[]).map(toCategory);
}

export async function saveCategories(categories: Category[]): Promise<Category[]> {
  const res = await fetch(`/api/brands/${COMPANY_ID}/categories`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ categories }),
  });
  if (!res.ok) throw new Error(await res.text());
  const { categories: saved } = (await res.json()) as { categories: Category[] };
  return saved;
}
