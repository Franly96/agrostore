"use client";

import { useActionState } from "react";
import { Button, TextField } from "@/components/agrostore";
import { FormAlert } from "@/components/form-alert";
import { type ActionState, idleState } from "@/src/lib/action-state";
import type { SetPasswordField } from "@/src/lib/validation/vendor";

type State = ActionState<SetPasswordField>;

export function SetPasswordForm({
  action,
}: {
  action: (prev: State, formData: FormData) => Promise<State>;
}) {
  const [state, formAction, pending] = useActionState(action, idleState as State);
  const e = state.fieldErrors ?? {};

  return (
    <form action={formAction} noValidate className="ag-form max-w-none md:max-w-[560px]">
      <h2 className="ag-form-title">Cambiar contraseña</h2>
      <p className="text-body-sm text-ink-muted">
        Úsalo si el vendedor olvidó su contraseña. Se cerrarán sus sesiones abiertas.
      </p>
      {state.message ? (
        <FormAlert tone={state.status === "success" ? "success" : "error"}>{state.message}</FormAlert>
      ) : null}
      <div className="ag-form-row">
        <TextField
          label="Contraseña nueva"
          name="password"
          type="text"
          autoComplete="new-password"
          required
          hint="Al menos 8 caracteres."
          error={e.password}
        />
        <TextField
          label="Repite la contraseña"
          name="confirmPassword"
          type="text"
          autoComplete="new-password"
          required
          error={e.confirmPassword}
        />
      </div>
      <div className="ag-form-actions">
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? "Guardando…" : "Cambiar contraseña"}
        </Button>
      </div>
    </form>
  );
}
