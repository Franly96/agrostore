import type { Metadata } from "next";

export const metadata: Metadata = { title: "Mi cuenta" };

export default function Page() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 md:px-6">
      <h1 className="text-heading text-ink">Mi cuenta</h1>
      <p className="mt-2 text-body text-ink-muted">Nombre, teléfono, provincia y direcciones de entrega.</p>
    </main>
  );
}
