import { Suspense } from "react";
import {
  ProductList,
  ProductListSkeleton,
} from "@/components/ui/product-list";

export default function Home() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-6 md:px-6">
      <h1 className="mb-6 text-heading text-ink">Del campo a tu mesa</h1>
      <Suspense fallback={<ProductListSkeleton />}>
        <ProductList />
      </Suspense>
    </main>
  );
}
