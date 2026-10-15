import type { Metadata } from "next";

export const metadata: Metadata = { title: "Pagar" };

export default function Page() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 md:px-6">
      <h1 className="text-heading text-ink">Pagar</h1>
      <p className="mt-2 text-body text-ink-muted">Datos de entrega y método de pago: contra entrega, transferencia o tarjeta.</p>
    </main>
  );
}
