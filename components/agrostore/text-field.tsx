import { useId, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";
import { Field, type FieldProps } from "./field";
import { cx } from "./format";

export type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "prefix"> &
  FieldProps & {
    prefix?: ReactNode;
    suffix?: ReactNode;
    multiline?: boolean;
    rows?: number;
  };

/** Labelled text input with hint, error, optional prefix/suffix (e.g. "RD$") and a multiline mode. */
export function TextField({
  label,
  hint,
  error,
  prefix,
  suffix,
  multiline,
  rows = 4,
  className,
  id: givenId,
  ...rest
}: TextFieldProps) {
  const autoId = useId();
  const id = givenId ?? autoId;
  const inputProps = {
    ...rest,
    id,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error || hint ? `${id}-hint` : undefined,
  };

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
      <div className={cx("ag-input", multiline && "ag-input-multi")}>
        {prefix ? <span className="ag-input-affix">{prefix}</span> : null}
        {multiline ? (
          <textarea
            rows={rows}
            {...(inputProps as TextareaHTMLAttributes<HTMLTextAreaElement>)}
            className="ag-input-el ag-textarea"
          />
        ) : (
          <input type="text" {...inputProps} className="ag-input-el" />
        )}
        {suffix ? <span className="ag-input-affix">{suffix}</span> : null}
      </div>
    </Field>
  );
}
