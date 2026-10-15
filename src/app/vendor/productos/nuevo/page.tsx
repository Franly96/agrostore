import type { Metadata } from "next";
import { Suspense } from "react";
import { requireRole } from "@/src/lib/dal";
import { FormSkeleton } from "@/components/form-skeleton";
import { createProduct } from "../actions";
import { ProductEditor } from "../product-editor";

export const metadata: Metadata = { title: "Publicar producto" };

export default function Page() {
  return (
    <main className="flex flex-col gap-4">
      <h1 className="text-heading text-ink">Publicar producto</h1>
      <Suspense fallback={<FormSkeleton />}>
        <NewProduct />
      </Suspense>
    </main>
  );
}

async function NewProduct() {
  await requireRole("seller", "/vendor/productos/nuevo");
  return <ProductEditor action={createProduct} submitLabel="Publicar producto" />;
}
