"use client";

import { useState } from "react";
import { Button } from "./button";
import { cx } from "./format";

export type SearchBarProps = {
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  buttonLabel?: string;
  label?: string;
  /** Submits natively (GET) to this URL when no `onSearch` is given. */
  action?: string;
  /** Query parameter name for native submits; default "q". */
  name?: string;
  onChange?: (value: string) => void;
  onSearch?: (value: string) => void;
  className?: string;
};

/** Full-width pill search field with a submit button. */
export function SearchBar({
  value: controlledValue,
  defaultValue = "",
  placeholder = "Buscar plátanos, aguacates, café…",
  buttonLabel = "Buscar",
  label = "Buscar productos",
  action,
  name = "q",
  onChange,
  onSearch,
  className,
}: SearchBarProps) {
  const [internal, setInternal] = useState(defaultValue);
  const value = controlledValue ?? internal;

  return (
    <form
      className={cx("ag-search", className)}
      role="search"
      action={onSearch ? undefined : action}
      onSubmit={(e) => {
        if (!onSearch) return;
        e.preventDefault();
        onSearch(value);
      }}
    >
      <svg
        className="ag-search-icon"
        width={20}
        height={20}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx={11} cy={11} r={7} />
        <path d="M20 20l-3.5-3.5" />
      </svg>
      <input
        className="ag-search-input"
        type="search"
        name={name}
        value={value}
        placeholder={placeholder}
        aria-label={label}
        onChange={(e) => {
          if (controlledValue == null) setInternal(e.target.value);
          onChange?.(e.target.value);
        }}
      />
      <Button type="submit" size="sm">
        {buttonLabel}
      </Button>
    </form>
  );
}
