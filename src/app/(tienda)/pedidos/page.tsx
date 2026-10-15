import type { Metadata } from "next";

export const metadata: Metadata = { title: "Mis pedidos" };

export default function Page() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 md:px-6">
      <h1 className="text-heading text-ink">Mis pedidos</h1>
      <p className="mt-2 text-body text-ink-muted">Historial de pedidos y su estado.</p>
    </main>
  );
}
