import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FormAlert } from "@/components/form-alert";
import { FormSkeleton } from "@/components/form-skeleton";
import { requireRole } from "@/src/lib/dal";
import { getVendor } from "@/src/lib/data/vendors";
import { parseId } from "@/src/lib/ids";
import { formatDrPhone } from "@/src/lib/validation/vendor";
import { setVendorActive, setVendorPassword, updateVendor } from "../actions";
import { SetPasswordForm } from "../set-password-form";
import { VendorForm } from "../vendor-form";
import { VendorStatus } from "../vendor-status";

export const metadata: Metadata = { title: "Editar vendedor" };

const OK_MESSAGES: Record<string, string> = {
  guardado: "Cambios guardados.",
  desactivado: "Vendedor desactivado. Sus sesiones se cerraron y sus productos ya no aparecen en la tienda.",
  reactivado: "Vendedor reactivado.",
};

export default function Page({ params, searchParams }: PageProps<"/admin/vendedores/[id]">) {
  return (
    <main className="flex flex-col gap-4">
      <Link
        href="/admin/vendedores"
        className="self-start rounded-sm text-body-sm font-semibold text-green-600 hover:text-green-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
      >
        ← Vendedores
      </Link>
      <Suspense
        fallback={
          <>
            <div className="h-9 w-64 animate-pulse rounded-sm bg-line" />
            <FormSkeleton fields={5} />
          </>
        }
      >
        <EditVendor params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function EditVendor({
  params,
  searchParams,
}: {
  params: PageProps<"/admin/vendedores/[id]">["params"];
  searchParams: PageProps<"/admin/vendedores/[id]">["searchParams"];
}) {
  const { id: rawId } = await params;
  await requireRole("admin", `/admin/vendedores/${encodeURIComponent(rawId)}`);
  const id = parseId(rawId);
  if (!id) notFound();
  const vendor = await getVendor(id);
  if (!vendor) notFound();

  const { ok } = await searchParams;
  const okMessage = typeof ok === "string" ? OK_MESSAGES[ok] : undefined;

  return (
    <>
      <h1 className="text-heading text-ink">{vendor.farmName ?? vendor.name}</h1>
      {okMessage ? <FormAlert tone="success">{okMessage}</FormAlert> : null}
      <VendorForm
        key={`${vendor.email}-${vendor.phone}-${vendor.farmName}`}
        mode="edit"
        action={updateVendor.bind(null, vendor.id)}
        initialValues={{
          farmName: vendor.farmName ?? "",
          name: vendor.name,
          email: vendor.email,
          phone: formatDrPhone(vendor.phone),
          province: vendor.province ?? "",
        }}
      />
      <SetPasswordForm action={setVendorPassword.bind(null, vendor.id)} />
      <VendorStatus
        key={String(vendor.banned)}
        banned={vendor.banned}
        setActive={setVendorActive.bind(null, vendor.id)}
      />
    </>
  );
}
