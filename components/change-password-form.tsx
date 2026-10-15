"use client";

import { useActionState } from "react";
import { Button, TextField } from "@/components/agrostore";
import { FormAlert } from "@/components/form-alert";
import { changePassword } from "@/src/lib/account-actions";
import { type ActionState, idleState } from "@/src/lib/action-state";
import type { ChangePasswordField } from "@/src/lib/validation/auth";

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(
    changePassword,
    idleState as ActionState<ChangePasswordField>,
  );
  const e = state.fieldErrors ?? {};

  return (
    <form action={formAction} noValidate className="ag-form max-w-none md:max-w-[560px]">
      <h2 className="ag-form-title">Cambiar contraseña</h2>
      {state.message ? (
        <FormAlert tone={state.status === "success" ? "success" : "error"}>{state.message}</FormAlert>
      ) : null}
      <TextField
        label="Contraseña actual"
        name="currentPassword"
        type="password"
        autoComplete="current-password"
        required
        error={e.currentPassword}
      />
      <div className="ag-form-row">
        <TextField
          label="Contraseña nueva"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          required
          hint="Al menos 8 caracteres."
          error={e.newPassword}
        />
        <TextField
          label="Repite la contraseña nueva"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          error={e.confirmPassword}
        />
      </div>
      <div className="ag-form-actions">
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : "Cambiar contraseña"}
        </Button>
      </div>
    </form>
  );
}
