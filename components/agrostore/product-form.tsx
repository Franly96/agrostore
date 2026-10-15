"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { Button } from "./button";
import { CATEGORIES, PROVINCES, UNITS } from "./constants";
import { cx } from "./format";
import { Select } from "./select";
import { TextField } from "./text-field";

export type ProductFormValues = {
  name: string;
  category: string;
  province: string;
  price: string;
  unit: string;
  stock: string;
  unlimitedStock: boolean;
  description: string;
  organic: boolean;
};

type FieldErrors = Partial<Record<keyof ProductFormValues, string>>;

export type ProductFormProps = {
  initialValues?: Partial<ProductFormValues>;
  /** Heading inside the form; pass null to omit it (e.g. when the page has an h1). */
  title?: string | null;
  submitLabel?: string;
  pendingLabel?: string;
  categories?: readonly string[];
  units?: readonly string[];
  /** Form action, e.g. from useActionState. Inputs post with their field names. */
  action?: (formData: FormData) => void;
  pending?: boolean;
  /** Runs before submitting; returning any errors cancels the submit. */
  validate?: (values: ProductFormValues) => FieldErrors;
  /** Errors returned by the server; shown until the next submit. */
  serverErrors?: FieldErrors;
  className?: string;
};

/** Seller form to publish or edit a product. */
export function ProductForm({
  initialValues: init = {},
  title = "Publicar producto",
  submitLabel = "Publicar producto",
  pendingLabel = "Guardando…",
  categories = CATEGORIES,
  units = UNITS,
  action,
  pending = false,
  validate,
  serverErrors = {},
  className,
}: ProductFormProps) {
  const [v, setV] = useState<ProductFormValues>({
    name: init.name ?? "",
    category: init.category ?? "",
    province: init.province ?? "",
    price: init.price ?? "",
    unit: init.unit ?? "",
    stock: init.stock ?? "0",
    unlimitedStock: init.unlimitedStock ?? false,
    description: init.description ?? "",
    organic: init.organic ?? false,
  });
  const [clientErrors, setClientErrors] = useState<FieldErrors>({});
  const errors: FieldErrors = { ...serverErrors, ...clientErrors };

  function set(k: keyof ProductFormValues) {
    return (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const val =
        e.target instanceof HTMLInputElement && e.target.type === "checkbox"
          ? e.target.checked
          : e.target.value;
      setV((prev) => ({ ...prev, [k]: val }));
    };
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    const found = validate?.(v) ?? {};
    setClientErrors(found);
    if (Object.keys(found).length > 0) e.preventDefault();
  }

  return (
    <form className={cx("ag-form", className)} noValidate action={action} onSubmit={onSubmit}>
      {title ? <h2 className="ag-form-title">{title}</h2> : null}
      <TextField
        label="Nombre del producto"
        name="name"
        required
        placeholder="Ej. Aguacate Semil"
        value={v.name}
        onChange={set("name")}
        error={errors.name}
      />
      <div className="ag-form-row">
        <Select
          label="Categoría"
          name="category"
          required
          placeholder="Elegir…"
          options={categories}
          value={v.category}
          onChange={set("category")}
          error={errors.category}
        />
        <Select
          label="Provincia"
          name="province"
          required
          placeholder="Elegir…"
          options={PROVINCES}
          value={v.province}
          onChange={set("province")}
          error={errors.province}
        />
      </div>
      <div className="ag-form-row">
        <TextField
          label="Precio"
          name="price"
          required
          prefix="RD$"
          inputMode="decimal"
          placeholder="0"
          value={v.price}
          onChange={set("price")}
          error={errors.price}
        />
        <Select
          label="Unidad de venta"
          name="unit"
          required
          placeholder="Elegir…"
          options={units}
          value={v.unit}
          onChange={set("unit")}
          error={errors.unit}
        />
      </div>
      <TextField
        label="Cantidad disponible"
        name="stock"
        inputMode="numeric"
        placeholder="Ej. 50"
        hint={
          v.unlimitedStock
            ? "Sin límite: el producto siempre aparece disponible."
            : "En la unidad de venta elegida. Se muestra como Agotado cuando llega a 0."
        }
        disabled={v.unlimitedStock}
        value={v.unlimitedStock ? "" : v.stock}
        onChange={set("stock")}
        error={v.unlimitedStock ? undefined : errors.stock}
      />
      <label className="ag-check">
        <input
          type="checkbox"
          name="unlimitedStock"
          checked={v.unlimitedStock}
          onChange={set("unlimitedStock")}
        />
        <span>Sin límite de cantidad</span>
      </label>
      <TextField
        label="Descripción"
        name="description"
        multiline
        rows={3}
        placeholder="Variedad, cosecha, cómo se entrega…"
        value={v.description}
        onChange={set("description")}
        error={errors.description}
      />
      <label className="ag-check">
        <input type="checkbox" name="organic" checked={v.organic} onChange={set("organic")} />
        <span>Producto orgánico</span>
      </label>
      <div className="ag-form-actions">
        <Button type="submit" disabled={pending}>
          {pending ? pendingLabel : submitLabel}
        </Button>
      </div>
    </form>
  );
}
