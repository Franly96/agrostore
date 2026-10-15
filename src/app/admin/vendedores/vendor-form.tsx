"use client";

import { useActionState, useState, type FormEvent } from "react";
import { Button, PROVINCES, Select, TextField } from "@/components/agrostore";
import { FormAlert } from "@/components/form-alert";
import { type ActionState, idleState } from "@/src/lib/action-state";
import {
  type VendorField,
  vendorCreateSchema,
  vendorUpdateSchema,
} from "@/src/lib/validation/vendor";

type State = ActionState<VendorField>;
type Values = Record<VendorField, string>;

export function VendorForm({
  mode,
  action,
  initialValues,
}: {
  mode: "create" | "edit";
  action: (prev: State, formData: FormData) => Promise<State>;
  initialValues?: Partial<Values>;
}) {
  const [state, formAction, pending] = useActionState(action, idleState as State);
  const [v, setV] = useState<Values>({
    farmName: initialValues?.farmName ?? "",
    name: initialValues?.name ?? "",
    email: initialValues?.email ?? "",
    phone: initialValues?.phone ?? "",
    province: initialValues?.province ?? "",
    password: "",
  });
  const [clientErrors, setClientErrors] = useState<Partial<Values>>({});
  const errors = { ...state.fieldErrors, ...clientErrors };

  const set = (k: VendorField) => (e: { target: { value: string } }) =>
    setV((prev) => ({ ...prev, [k]: e.target.value }));

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    const schema = mode === "create" ? vendorCreateSchema : vendorUpdateSchema;
    const result = schema.safeParse(v);
    const found: Partial<Values> = {};
    if (!result.success) {
      for (const issue of result.error.issues) {
        const key = issue.path[0] as VendorField;
        if (key && !(key in found)) found[key] = issue.message;
      }
    }
    setClientErrors(found);
    if (Object.keys(found).length > 0) e.preventDefault();
  }

  return (
    <form
      action={formAction}
      onSubmit={onSubmit}
      noValidate
      className="ag-form max-w-none md:max-w-[560px]"
    >
      {mode === "edit" ? <h2 className="ag-form-title">Datos del vendedor</h2> : null}
      {state.status === "error" && state.message ? <FormAlert>{state.message}</FormAlert> : null}
      <TextField
        label="Finca o negocio"
        name="farmName"
        required
        placeholder="Ej. Finca Los Ríos"
        hint="Es el nombre que ven los compradores."
        value={v.farmName}
        onChange={set("farmName")}
        error={errors.farmName}
      />
      <TextField
        label="Persona de contacto"
        name="name"
        required
        autoComplete="off"
        placeholder="Ej. Ana Rodríguez"
        value={v.name}
        onChange={set("name")}
        error={errors.name}
      />
      <div className="ag-form-row">
        <TextField
          label="Correo"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="off"
          required
          hint="Con este correo ingresa al panel."
          value={v.email}
          onChange={set("email")}
          error={errors.email}
        />
        <TextField
          label="Teléfono"
          name="phone"
          type="tel"
          inputMode="tel"
          required
          placeholder="809-555-1234"
          value={v.phone}
          onChange={set("phone")}
          error={errors.phone}
        />
      </div>
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
      {mode === "create" ? (
        <TextField
          label="Contraseña temporal"
          name="password"
          type="text"
          autoComplete="new-password"
          required
          hint="Al menos 8 caracteres. Compártela con el vendedor; podrá cambiarla en Mi cuenta."
          value={v.password}
          onChange={set("password")}
          error={errors.password}
        />
      ) : null}
      <div className="ag-form-actions">
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : mode === "create" ? "Crear vendedor" : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}
