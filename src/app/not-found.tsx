import { ButtonLink } from "@/components/agrostore";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-heading text-ink">Página no encontrada</h1>
      <p className="text-body text-ink-muted">La página que buscas no existe o fue movida.</p>
      <ButtonLink href="/">Volver al inicio</ButtonLink>
    </main>
  );
}
