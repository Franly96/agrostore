import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireRole } from "@/src/lib/dal";
import { getSellerProduct } from "@/src/lib/data/products";
import { parseId } from "@/src/lib/ids";
import { productToDraft } from "@/src/lib/validation/product";
import { FormSkeleton } from "@/components/form-skeleton";
import { updateProduct } from "../actions";
import { ProductEditor } from "../product-editor";

export const metadata: Metadata = { title: "Editar producto" };

export default function Page({ params }: PageProps<"/panel/productos/[id]">) {
  return (
    <main className="flex flex-col gap-4">
      <h1 className="text-heading text-ink">Editar producto</h1>
      <Suspense fallback={<FormSkeleton />}>
        <EditProduct params={params} />
      </Suspense>
    </main>
  );
}

async function EditProduct({ params }: { params: PageProps<"/panel/productos/[id]">["params"] }) {
  const { id: rawId } = await params;
  const user = await requireRole("seller", `/panel/productos/${encodeURIComponent(rawId)}`);
  const id = parseId(rawId);
  if (!id) notFound();

  const product = await getSellerProduct(user.id, id);
  if (!product) notFound();

  return (
    <ProductEditor
      action={updateProduct.bind(null, id)}
      initialValues={productToDraft(product)}
      submitLabel="Guardar cambios"
    />
  );
}
