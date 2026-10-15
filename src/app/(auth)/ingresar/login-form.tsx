"use client";

import { useActionState, useState } from "react";
import { Button, TextField } from "@/components/agrostore";
import { idleState } from "@/src/lib/action-state";
import { signIn } from "@/src/lib/auth-actions";
import { FormAlert } from "@/components/form-alert";

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState(signIn, idleState);
  const [email, setEmail] = useState("");

  return (
    <form action={formAction} noValidate className="mt-6 flex flex-col gap-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      {state.message ? <FormAlert>{state.message}</FormAlert> : null}
      <TextField
        label="Correo"
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={state.fieldErrors?.email}
      />
      <TextField
        label="Contraseña"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        error={state.fieldErrors?.password}
      />
      <Button type="submit" fullWidth disabled={pending}>
        {pending ? "Ingresando…" : "Ingresar"}
      </Button>
    </form>
  );
}
