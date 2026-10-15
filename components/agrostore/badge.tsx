import type { ReactNode } from "react";
import { cx } from "./format";

export type BadgeTone = "neutral" | "green" | "offer" | "danger";

/** Small label: neutral attributes, green (Orgánico, De temporada), offer (Oferta), danger (Agotado). */
export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  children?: ReactNode;
}) {
  return <span className={cx("ag-badge", `ag-badge-${tone}`, className)}>{children}</span>;
}
