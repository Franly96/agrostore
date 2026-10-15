import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps } from "react";
import { cx } from "./format";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

type StyleProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
};

export function buttonClassName({
  variant = "primary",
  size = "md",
  fullWidth,
  className,
}: StyleProps = {}) {
  return cx(
    "ag-btn",
    `ag-btn-${variant}`,
    `ag-btn-${size}`,
    fullWidth && "ag-btn-full",
    className,
  );
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & StyleProps;

/** Pill button: `primary` for the one main action, `secondary` outline for alternatives, `ghost` low-emphasis, `danger` destructive. */
export function Button({
  variant,
  size,
  fullWidth,
  className,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClassName({ variant, size, fullWidth, className })}
      {...rest}
    />
  );
}

export type ButtonLinkProps = ComponentProps<typeof Link> & StyleProps;

/** A link that looks like a Button, for navigation actions. */
export function ButtonLink({
  variant,
  size,
  fullWidth,
  className,
  ...rest
}: ButtonLinkProps) {
  return (
    <Link
      className={buttonClassName({ variant, size, fullWidth, className })}
      {...rest}
    />
  );
}
