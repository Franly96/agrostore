import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = { title: "Detalle del pedido" };

export default function Page({ params }: PageProps<"/pedidos/[id]">) {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 md:px-6">
      <h1 className="text-heading text-ink">Detalle del pedido</h1>
      <Suspense
        fallback={<p className="mt-2 h-5 w-24 animate-pulse rounded-sm bg-line" />}
      >
        {params.then(({ id }) => (
          <p className="mt-2 text-body-sm text-ink-muted">Pedido #{id}</p>
        ))}
      </Suspense>
      <p className="mt-2 text-body text-ink-muted">Productos, total, dirección de entrega y estado del pedido.</p>
    </main>
  );
}
