"use server";

import { isAPIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { type ActionState, fieldErrorsFrom } from "./action-state";
import { auth } from "./auth";
import { getCurrentUser } from "./dal";
import { type ChangePasswordField, changePasswordSchema } from "./validation/auth";

type State = ActionState<ChangePasswordField>;

export async function changePassword(_prev: State, formData: FormData): Promise<State> {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const parsed = changePasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };

  try {
    await auth.api.changePassword({
      body: {
        currentPassword: parsed.data.currentPassword,
        newPassword: parsed.data.newPassword,
        revokeOtherSessions: true,
      },
      headers: await headers(),
    });
  } catch (error) {
    if (isAPIError(error) && error.body?.code === "INVALID_PASSWORD") {
      return {
        status: "error",
        fieldErrors: { currentPassword: "La contraseña actual no es correcta." },
      };
    }
    console.error("changePassword failed", error);
    return { status: "error", message: "No pudimos cambiar la contraseña. Inténtalo de nuevo." };
  }
  return {
    status: "success",
    message: "Contraseña actualizada. Cerramos tus otras sesiones abiertas.",
  };
}
