"use client";

import { useId, useLayoutEffect, useRef, type SelectHTMLAttributes } from "react";
import { Field, type FieldProps } from "./field";

export type SelectOption = string | { value: string; label: string };

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> &
  FieldProps & {
    options: readonly SelectOption[];
    /** Disabled first option shown until a value is picked, e.g. "Elegir…". */
    placeholder?: string;
  };

/** Labelled native select with the same frame as TextField. */
export function Select({
  label,
  hint,
  error,
  options,
  placeholder,
  className,
  id: givenId,
  ...rest
}: SelectProps) {
  const autoId = useId();
  const id = givenId ?? autoId;
  const selectRef = useRef<HTMLSelectElement>(null);
  const value = rest.value;

  // React 19 resets the form after a form action finishes. It re-syncs a
  // controlled <input> afterwards but not a <select>, which would go back to the
  // placeholder while state still holds the choice. Re-apply it after every commit.
  useLayoutEffect(() => {
    const el = selectRef.current;
    if (el && (typeof value === "string" || typeof value === "number") && el.value !== String(value)) {
      el.value = String(value);
    }
  });

  const opts = options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
  const defaultValue =
    rest.value == null && rest.defaultValue == null && placeholder ? "" : rest.defaultValue;

  return (
    <Field
      id={id}
      label={label}
      hint={hint}
      error={error}
      required={rest.required}
      disabled={rest.disabled}
      className={className}
    >
      <div className="ag-input ag-select">
        <select
          {...rest}
          ref={selectRef}
          defaultValue={defaultValue}
          id={id}
          className="ag-select-el"
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? `${id}-hint` : undefined}
        >
          {placeholder ? (
            <option value="" disabled>
              {placeholder}
            </option>
          ) : null}
          {opts.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <svg
          className="ag-select-caret"
          width={16}
          height={16}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>
    </Field>
  );
}
