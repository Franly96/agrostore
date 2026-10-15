import type { Metadata } from "next";
import { CartView } from "@/components/cart-view";

export const metadata: Metadata = { title: "Carrito" };

export default function Page() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 md:px-6">
      <h1 className="text-heading text-ink">Carrito</h1>
      {/* The cart lives in this browser's localStorage, so the list is rendered on the client. */}
      <div className="mt-6">
        <CartView />
      </div>
    </main>
  );
}
