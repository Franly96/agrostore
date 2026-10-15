import type { Metadata } from "next";
import { Suspense } from "react";
import { requireRole } from "@/src/lib/dal";
import { FormSkeleton } from "@/components/form-skeleton";
import { createVendor } from "../actions";
import { VendorForm } from "../vendor-form";

export const metadata: Metadata = { title: "Nuevo vendedor" };

export default function Page() {
  return (
    <main className="flex flex-col gap-4">
      <h1 className="text-heading text-ink">Nuevo vendedor</h1>
      <Suspense fallback={<FormSkeleton fields={6} />}>
        <NewVendor />
      </Suspense>
    </main>
  );
}

async function NewVendor() {
  await requireRole("admin", "/admin/vendedores/nuevo");
  return <VendorForm mode="create" action={createVendor} />;
}
