"use client";

import { useEffect, useState } from "react";
import { Badge, Button, ButtonLink, CartItem, centsToPesos, formatRD } from "@/components/agrostore";
import { MAX_LINE_QTY, type CartLine, type CartProduct } from "@/src/lib/cart";
import { removeFromCart, setCartQty, useCartLines, useCartReady } from "@/src/lib/cart-store";

// What the browser knows about each product in the cart: the product, or null once the server
// said it no longer exists (or its seller was deactivated).
type Known = Map<number, CartProduct | null>;

function useCartProducts(lines: CartLine[]) {
  const [known, setKnown] = useState<Known>(() => new Map());
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const key = lines.map((l) => l.productId).join(",");

  // Asks only for the products it doesn't know yet, so changing a quantity or removing a line
  // never refetches.
  useEffect(() => {
    const missing = key ? key.split(",").map(Number).filter((id) => !known.has(id)) : [];
    if (missing.length === 0) return;

    const controller = new AbortController();
    fetch(`/api/cart?ids=${missing.join(",")}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<{ items: CartProduct[] }>;
      })
      .then(({ items }) => {
        setKnown((prev) => {
          const next = new Map(prev);
          for (const id of missing) next.set(id, null);
          for (const product of items) next.set(product.id, product);
          return next;
        });
        setFailed(false);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setFailed(true);
      });
    return () => controller.abort();
  }, [key, known, attempt]);

  const loading = lines.some((l) => !known.has(l.productId));
  return {
    known,
    loading: loading && !failed,
    failed: loading && failed,
    retry: () => {
      setFailed(false);
      setAttempt((n) => n + 1);
    },
  };
}

function maxFor(product: CartProduct) {
  return product.unlimitedStock ? MAX_LINE_QTY : Math.min(product.stock, MAX_LINE_QTY);
}

type Row = { line: CartLine; product: CartProduct | null };
type Group = { key: string; name: string; rows: Row[] };

function groupBySeller(rows: Row[]): Group[] {
  const groups = new Map<string, Group>();
  for (const row of rows) {
    const key = row.product ? `s${row.product.sellerId}` : "gone";
    const group = groups.get(key) ?? {
      key,
      name: row.product ? row.product.sellerName : "Ya no disponibles",
      rows: [],
    };
    group.rows.push(row);
    groups.set(key, group);
  }
  // Sellers alphabetically, the "gone" group last.
  return [...groups.values()].sort(
    (a, b) => Number(a.key === "gone") - Number(b.key === "gone") || a.name.localeCompare(b.name, "es"),
  );
}

function UnavailableRow({ name, reason, onRemove }: { name: string; reason: string; onRemove: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line py-4">
      <div className="flex min-w-0 flex-col gap-1">
        <p className="text-body font-semibold text-ink-muted">{name}</p>
        <Badge tone="danger" className="self-start">
          {reason}
        </Badge>
      </div>
      <Button variant="ghost" size="sm" className="min-h-11" onClick={onRemove}>
        Eliminar
      </Button>
    </div>
  );
}

function CartSkeleton({ rows }: { rows: number }) {
  return (
    <div className="flex animate-pulse flex-col gap-4" aria-busy="true">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex gap-4 border-b border-line py-4">
          <div className="size-[72px] flex-none rounded-sm bg-green-100" />
          <div className="flex flex-1 flex-col gap-2">
            <div className="h-5 w-2/3 rounded-sm bg-line" />
            <div className="h-4 w-1/3 rounded-sm bg-line" />
            <div className="h-5 w-1/2 rounded-sm bg-line" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** The cart page body: the products saved in this browser, grouped by seller, with the total. */
export function CartView() {
  const ready = useCartReady();
  const lines = useCartLines();
  const { known, loading, failed, retry } = useCartProducts(lines);

  if (!ready) return <CartSkeleton rows={2} />;

  if (lines.length === 0) {
    return (
      <div className="rounded-md border border-line bg-surface p-6 text-center">
        <p className="text-title text-ink">Tu carrito está vacío</p>
        <p className="mt-2 text-body text-ink-muted">
          Agrega productos desde el catálogo y aparecerán aquí.
        </p>
        <ButtonLink href="/productos" className="mt-4">
          Ver productos
        </ButtonLink>
      </div>
    );
  }

  if (failed) {
    return (
      <div className="rounded-md border border-line bg-surface p-6 text-center">
        <p className="text-title text-ink">No pudimos cargar tu carrito</p>
        <p className="mt-2 text-body text-ink-muted">Revisa tu conexión e inténtalo de nuevo.</p>
        <Button variant="secondary" className="mt-4 min-h-11" onClick={retry}>
          Reintentar
        </Button>
      </div>
    );
  }

  if (loading) return <CartSkeleton rows={Math.min(lines.length, 3)} />;

  const rows: Row[] = lines.map((line) => ({ line, product: known.get(line.productId) ?? null }));
  const groups = groupBySeller(rows);

  // The quantity shown never exceeds the stock; sold-out and missing lines don't count.
  const qtyFor = (row: Row & { product: CartProduct }) => Math.min(row.line.qty, maxFor(row.product));
  const available = (row: Row): row is Row & { product: CartProduct } =>
    row.product !== null && maxFor(row.product) > 0;
  const subtotalCents = (group: Group) =>
    group.rows.filter(available).reduce((sum, row) => sum + row.product.priceCents * qtyFor(row), 0);
  const totalCents = groups.reduce((sum, group) => sum + subtotalCents(group), 0);
  // The summary only lists what can actually be bought.
  const buyable = groups.filter((group) => group.rows.some(available));
  const count = rows.filter(available).length;

  return (
    <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
      <div className="flex flex-col gap-8">
        {groups.map((group) => (
          <section key={group.key} aria-labelledby={`vendedor-${group.key}`}>
            <h2 id={`vendedor-${group.key}`} className="text-title text-ink">
              {group.name}
            </h2>
            <div className="mt-2 border-t border-line">
              {group.rows.map((row) => {
                if (!row.product) {
                  return (
                    <UnavailableRow
                      key={row.line.productId}
                      name="Producto no disponible"
                      reason="Ya no está a la venta"
                      onRemove={() => removeFromCart(row.line.productId)}
                    />
                  );
                }
                if (!available(row)) {
                  return (
                    <UnavailableRow
                      key={row.line.productId}
                      name={row.product.name}
                      reason="Agotado"
                      onRemove={() => removeFromCart(row.line.productId)}
                    />
                  );
                }
                const { product, line } = row;
                const qty = qtyFor(row);
                return (
                  <div key={line.productId} className="border-b border-line">
                    <CartItem
                      name={product.name}
                      price={centsToPesos(product.priceCents)}
                      unit={product.unit}
                      quantity={qty}
                      max={maxFor(product)}
                      imageSrc={product.imageUrl ?? undefined}
                      onQuantityChange={(next) => setCartQty(line.productId, next)}
                      onRemove={() => removeFromCart(line.productId)}
                      // 44px tap targets: the design system's stepper buttons are 32px.
                      className="border-b-0 [&_.ag-stepper-btn]:size-11"
                    />
                    {line.qty > qty ? (
                      <p className="pb-4 text-body-sm text-danger">
                        Solo hay {qty} disponibles; ajustamos la cantidad.
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <aside
        aria-labelledby="resumen"
        className="flex flex-col gap-4 rounded-md border border-line bg-surface p-4 md:p-6 lg:sticky lg:top-6"
      >
        <h2 id="resumen" className="text-title text-ink">
          Resumen
        </h2>
        {buyable.length > 1 ? (
          <dl className="flex flex-col gap-2 text-body-sm text-ink-muted">
            {buyable.map((group) => (
              <div key={group.key} className="flex justify-between gap-4">
                <dt className="min-w-0 truncate">{group.name}</dt>
                <dd className="font-semibold text-ink">{formatRD(centsToPesos(subtotalCents(group)))}</dd>
              </div>
            ))}
          </dl>
        ) : null}
        <p className="flex items-baseline justify-between gap-4 border-t border-line pt-4 text-title text-ink">
          <span>
            Total{" "}
            <span className="text-body-sm font-normal text-ink-muted">
              ({count} {count === 1 ? "producto" : "productos"})
            </span>
          </span>
          <span className="font-bold">{formatRD(centsToPesos(totalCents))}</span>
        </p>
        <ButtonLink href="/productos" variant="secondary" fullWidth className="min-h-11">
          Seguir comprando
        </ButtonLink>
      </aside>
    </div>
  );
}
