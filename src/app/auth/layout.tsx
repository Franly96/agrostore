import type { ReactNode } from "react";
import Link from "next/link";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-surface-soft p-6">
      <Link href="/" className="mb-6 text-heading font-extrabold text-green-600">
        Agrostore
      </Link>
      <div className="w-full max-w-sm rounded-md border border-line bg-surface p-6">{children}</div>
    </div>
  );
}
