import { Button, ButtonLink } from "@/components/agrostore";
import { buildHref } from "@/src/lib/list-query";

/**
 * Previous / next links for a server-paginated list. `params` are the other filters of the
 * list (search term, category…); the page itself travels in `?pagina=`. Renders nothing for a
 * single page.
 */
export function Pagination({
  page,
  pages,
  path,
  params = {},
}: {
  page: number;
  pages: number;
  path: string;
  params?: Record<string, string | undefined>;
}) {
  if (pages <= 1) return null;

  const href = (target: number) =>
    buildHref(path, { ...params, pagina: target > 1 ? target : undefined });

  return (
    <nav aria-label="Paginación" className="mt-6 flex items-center justify-between gap-2">
      {page > 1 ? (
        <ButtonLink href={href(page - 1)} variant="secondary" size="sm" rel="prev" className="min-h-11">
          Anterior
        </ButtonLink>
      ) : (
        <Button variant="secondary" size="sm" disabled className="min-h-11">
          Anterior
        </Button>
      )}
      <p className="text-center text-body-sm text-ink-muted">
        Página {page} de {pages}
      </p>
      {page < pages ? (
        <ButtonLink href={href(page + 1)} variant="secondary" size="sm" rel="next" className="min-h-11">
          Siguiente
        </ButtonLink>
      ) : (
        <Button variant="secondary" size="sm" disabled className="min-h-11">
          Siguiente
        </Button>
      )}
    </nav>
  );
}
