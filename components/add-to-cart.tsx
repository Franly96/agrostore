"use client";

import { Check, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button, QuantityStepper } from "@/components/agrostore";
import { MAX_CART_LINES, MAX_LINE_QTY } from "@/src/lib/cart";
import { addToCart, useCartLines } from "@/src/lib/cart-store";

type Feedback = { text: string; problem: boolean };

function describe(result: ReturnType<typeof addToCart>): Feedback {
  switch (result.status) {
    case "added":
      return { text: "Agregado al carrito.", problem: false };
    case "capped":
      return { text: "Agregado. Ya tienes en el carrito todo lo disponible.", problem: false };
    case "maxed":
      return { text: "Ya tienes en el carrito todo lo disponible.", problem: true };
    case "full":
      return { text: `Tu carrito llegó al máximo de ${MAX_CART_LINES} productos.`, problem: true };
    case "error":
      return { text: "No pudimos guardar el carrito en este navegador.", problem: true };
  }
}

// Shared state of one add-to-cart control: what's already in the cart, how much more can be
// added (`max` is the stock, or MAX_LINE_QTY when unlimited) and the message to show.
function useAddToCart(productId: number, max: number) {
  const lines = useCartLines();
  const inCart = lines.find((l) => l.productId === productId)?.qty ?? 0;
  const remaining = Math.max(0, Math.min(max, MAX_LINE_QTY) - inCart);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [justAdded, setJustAdded] = useState(false);

  useEffect(() => {
    if (!justAdded) return;
    const timer = setTimeout(() => setJustAdded(false), 2000);
    return () => clearTimeout(timer);
  }, [justAdded]);

  function add(qty: number) {
    const result = addToCart(productId, qty, max);
    setFeedback(describe(result));
    setJustAdded(result.status === "added" || result.status === "capped");
  }

  return { inCart, remaining, feedback, justAdded, add };
}

function Status({ feedback }: { feedback: Feedback | null }) {
  // Always mounted so screen readers announce the text when it changes; successes are only
  // announced (the button already says "Agregado"), problems are also shown.
  return (
    <p role="status" className={feedback?.problem ? "text-label text-danger" : "sr-only"}>
      {feedback?.text}
    </p>
  );
}

function ButtonLabel({ justAdded, remaining, idle }: { justAdded: boolean; remaining: number; idle: string }) {
  if (justAdded) {
    return (
      <>
        <Check aria-hidden="true" size={18} />
        Agregado
      </>
    );
  }
  return remaining === 0 ? "En el carrito" : idle;
}

/**
 * The card's control: a cart icon button that adds one unit per click. The badge on it is the
 * quantity of this product already in the cart.
 */
export function AddToCartButton({
  productId,
  name,
  max,
}: {
  productId: number;
  name: string;
  max: number;
}) {
  const { inCart, remaining, feedback, justAdded, add } = useAddToCart(productId, max);
  const full = remaining === 0;
  const label = full
    ? `Ya tienes todo lo disponible de ${name} en el carrito`
    : `Agregar ${name} al carrito${inCart > 0 ? `, ${inCart} en el carrito` : ""}`;

  return (
    <div className="flex flex-col items-end gap-1">
      {/* mt-0: the card styles put a top margin on every button inside it. */}
      <Button
        size="sm"
        className="relative mt-0 size-11 min-w-11 p-0"
        disabled={full}
        aria-label={label}
        title={full ? undefined : "Agregar al carrito"}
        onClick={() => add(1)}
      >
        {justAdded ? (
          <Check aria-hidden="true" size={22} />
        ) : (
          <ShoppingCart aria-hidden="true" size={22} />
        )}
        {inCart > 0 ? (
          <span
            aria-hidden="true"
            className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-pill border border-green-600 bg-surface px-1 text-label text-green-800"
          >
            {inCart}
          </span>
        ) : null}
      </Button>
      <Status feedback={feedback} />
    </div>
  );
}

/** Product page control: quantity stepper plus the add button and a link to the cart. */
export function AddToCartPanel({ productId, max }: { productId: number; max: number }) {
  const { inCart, remaining, feedback, justAdded, add } = useAddToCart(productId, max);
  const [qty, setQty] = useState(1);
  const room = Math.max(1, remaining);
  const value = Math.min(qty, room);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-4">
        <QuantityStepper
          value={value}
          min={1}
          max={room}
          disabled={remaining === 0}
          label="Cantidad a agregar"
          onChange={setQty}
          // 44px tap targets: the design system's stepper buttons are 32px.
          className="[&_.ag-stepper-btn]:size-11"
        />
        <Button
          className="min-h-11 grow md:grow-0"
          disabled={remaining === 0}
          onClick={() => {
            add(value);
            setQty(1);
          }}
        >
          <ButtonLabel justAdded={justAdded} remaining={remaining} idle="Agregar al carrito" />
        </Button>
      </div>
      {inCart > 0 ? (
        <p className="text-body-sm text-ink-muted">
          Tienes {inCart} en el carrito.{" "}
          <Link
            href="/carrito"
            className="inline-flex min-h-11 items-center rounded-sm font-semibold text-green-600 hover:text-green-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
          >
            Ver carrito
          </Link>
        </p>
      ) : null}
      <Status feedback={feedback} />
    </div>
  );
}
