"use client";

import Link from "next/link";
import { useState } from "react";
import { cx } from "./format";

type ChipValue = string | null | string[];

export type CategoryChipsProps = {
  /** An option with `href` renders as a link (URL-driven filters, works without JavaScript). */
  options: { value: string; label: string; count?: number; href?: string }[];
  /** A single value (or null), or an array with `multiple`. */
  value?: ChipValue;
  defaultValue?: ChipValue;
  multiple?: boolean;
  /** One horizontally scrolling row instead of wrapping. */
  scroll?: boolean;
  label?: string;
  onChange?: (value: ChipValue) => void;
  className?: string;
};

/** Toggleable pill chips for browsing categories and filtering the catalogue. */
export function CategoryChips({
  options,
  value: controlledValue,
  defaultValue,
  multiple = false,
  scroll,
  label = "Categorías",
  onChange,
  className,
}: CategoryChipsProps) {
  const [internal, setInternal] = useState<ChipValue>(
    defaultValue !== undefined ? defaultValue : multiple ? [] : null,
  );
  const value = controlledValue !== undefined ? controlledValue : internal;

  function isOn(v: string) {
    return multiple ? ((value as string[] | null) ?? []).includes(v) : value === v;
  }

  function toggle(v: string) {
    let next: ChipValue;
    if (multiple) {
      const arr = [...((value as string[] | null) ?? [])];
      const i = arr.indexOf(v);
      if (i >= 0) arr.splice(i, 1);
      else arr.push(v);
      next = arr;
    } else {
      next = value === v ? null : v;
    }
    if (controlledValue === undefined) setInternal(next);
    onChange?.(next);
  }

  return (
    <div
      className={cx("ag-chips", scroll && "ag-chips-scroll", className)}
      role="group"
      aria-label={label}
    >
      {options.map((o) => {
        const on = isOn(o.value);
        const content = (
          <>
            {o.label}
            {o.count != null ? <span className="ag-chip-count">{o.count}</span> : null}
          </>
        );
        // min-h-11: 44px tap target.
        const className = cx("ag-chip min-h-11", on && "ag-chip-on");
        if (o.href) {
          return (
            <Link key={o.value} href={o.href} className={className} aria-current={on ? "true" : undefined}>
              {content}
            </Link>
          );
        }
        return (
          <button
            key={o.value}
            type="button"
            className={className}
            aria-pressed={on}
            onClick={() => toggle(o.value)}
          >
            {content}
          </button>
        );
      })}
    </div>
  );
}
