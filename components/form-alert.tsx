import type { ReactNode } from "react";

/** General form message: `error` (danger) or `success` (green). */
export function FormAlert({
  tone = "error",
  children,
}: {
  tone?: "error" | "success";
  children: ReactNode;
}) {
  const toneClass =
    tone === "error"
      ? "border-danger text-danger"
      : "border-green-600 bg-green-100 text-green-800";
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-sm border bg-surface px-4 py-2 text-body-sm font-semibold ${toneClass}`}
    >
      {children}
    </p>
  );
}
