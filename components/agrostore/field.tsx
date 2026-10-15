import type { ReactNode } from "react";
import { cx } from "./format";

export type FieldProps = {
  label?: string;
  /** Helper text under the field. */
  hint?: string;
  /** Error message; turns the border danger and replaces the hint. */
  error?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
};

export function Field({
  id,
  label,
  hint,
  error,
  required,
  disabled,
  className,
  children,
}: FieldProps & { id: string; children: ReactNode }) {
  const msg = error || hint;
  return (
    <div
      className={cx(
        "ag-field",
        error && "ag-field-error",
        disabled && "ag-field-disabled",
        className,
      )}
    >
      {label ? (
        <label className="ag-field-label" htmlFor={id}>
          {label}
          {required ? (
            <span className="ag-field-req" aria-hidden="true">
              {" *"}
            </span>
          ) : null}
        </label>
      ) : null}
      {children}
      {msg ? (
        <p
          className={error ? "ag-field-msg ag-field-msg-error" : "ag-field-msg"}
          id={`${id}-hint`}
        >
          {msg}
        </p>
      ) : null}
    </div>
  );
}
