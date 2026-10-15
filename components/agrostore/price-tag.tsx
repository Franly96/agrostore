import { cx, formatRD } from "./format";

/** Price in Dominican pesos with its sales unit and an optional struck-through previous price. `amount` is in pesos, not centavos. */
export function PriceTag({
  amount,
  unit,
  originalAmount,
  className,
}: {
  amount: number;
  unit?: string;
  originalAmount?: number;
  className?: string;
}) {
  const hasOld = originalAmount != null && originalAmount > amount;
  return (
    <span className={cx("ag-price", className)}>
      <span className="ag-price-amount">{formatRD(amount)}</span>
      {unit ? <span className="ag-price-unit">/ {unit}</span> : null}
      {hasOld ? <s className="ag-price-old">{formatRD(originalAmount)}</s> : null}
    </span>
  );
}
