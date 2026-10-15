"use client";

import { useState } from "react";
import { cx } from "./format";

export type QuantityStepperProps = {
  value?: number;
  defaultValue?: number;
  min?: number;
  max?: number;
  /** Unit after the number, e.g. "lb". */
  unit?: string;
  disabled?: boolean;
  /** Accessible group label; default "Cantidad". */
  label?: string;
  onChange?: (value: number) => void;
  className?: string;
};

/** − / + quantity control. Controlled with `value` + `onChange`, or uncontrolled with `defaultValue`. */
export function QuantityStepper({
  value: controlledValue,
  defaultValue,
  min = 1,
  max = 99,
  unit,
  disabled,
  label = "Cantidad",
  onChange,
  className,
}: QuantityStepperProps) {
  const [internal, setInternal] = useState(defaultValue ?? min);
  const value = controlledValue ?? internal;

  function set(v: number) {
    const next = Math.max(min, Math.min(max, v));
    if (controlledValue == null) setInternal(next);
    onChange?.(next);
  }

  return (
    <div className={cx("ag-stepper", className)} role="group" aria-label={label}>
      <button
        type="button"
        className="ag-stepper-btn"
        aria-label="Disminuir"
        disabled={disabled || value <= min}
        onClick={() => set(value - 1)}
      >
        −
      </button>
      <span className="ag-stepper-value" aria-live="polite">
        {value}
        {unit ? <span className="ag-stepper-unit"> {unit}</span> : null}
      </span>
      <button
        type="button"
        className="ag-stepper-btn"
        aria-label="Aumentar"
        disabled={disabled || value >= max}
        onClick={() => set(value + 1)}
      >
        +
      </button>
    </div>
  );
}
