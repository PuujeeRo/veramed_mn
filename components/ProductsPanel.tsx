"use client";

// The Products section: header with the Add action, the product table, and
// the slide-over form a new product starts in. `?new=1` opens the form
// directly (Overview's "Add product" links here).

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { FiPlus } from "react-icons/fi";
import { useLanguage } from "@/lib/i18n";
import { useRouter } from "@/lib/navigation";
import { Product } from "@/lib/types";
import PageHeader from "./ui/PageHeader";
import ProductsTable from "./ProductsTable";
import ProductCreateForm from "./ProductCreateForm";

export default function ProductsPanel({
  products,
  onCreated,
}: {
  products: Product[];
  onCreated: (product: Product) => void;
}) {
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [creating, setCreating] = useState(searchParams.get("new") === "1");

  return (
    <>
      <PageHeader
        title={t("dash.tabProducts")}
        description={t("dash.descProducts")}
        actions={
          <button type="button" onClick={() => setCreating(true)} className="btn-primary">
            <FiPlus size={16} /> {t("dash.addProduct")}
          </button>
        }
      />

      <ProductsTable products={products} onAdd={() => setCreating(true)} />

      <ProductCreateForm
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(p) => {
          onCreated(p);
          setCreating(false);
          // The create form only collects what a product needs to exist;
          // the rest lives in the full editor. Go straight there.
          router.push(`/dashboard/products/${p.id}`);
        }}
      />
    </>
  );
}
