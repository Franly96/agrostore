import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = { title: "Perfil del vendedor" };

export default function Page({ params }: PageProps<"/vendedores/[id]">) {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 md:px-6">
      <h1 className="text-heading text-ink">Perfil del vendedor</h1>
      <Suspense
        fallback={<p className="mt-2 h-5 w-24 animate-pulse rounded-sm bg-line" />}
      >
        {params.then(({ id }) => (
          <p className="mt-2 text-body-sm text-ink-muted">Vendedor #{id}</p>
        ))}
      </Suspense>
      <p className="mt-2 text-body text-ink-muted">Información de la finca y sus productos.</p>
    </main>
  );
}
