"use server";

import { createHash } from "node:crypto";
import { isAPIError } from "better-auth/api";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/src/db";
import { users } from "@/src/db/schema";
import { type ActionState, fieldErrorsFrom } from "./action-state";
import { auth } from "./auth";
import { isRole, safeNext } from "./roles";
import { clientIp, consumeAttempt } from "./throttle";
import { type LoginField, loginSchema } from "./validation/auth";

const FIVE_MINUTES = 5 * 60_000;

export async function signIn(
  _prev: ActionState<LoginField>,
  formData: FormData,
): Promise<ActionState<LoginField>> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };
  }
  const { email, password, next } = parsed.data;

  const ip = await clientIp();
  const emailKey = createHash("sha256").update(email).digest("hex").slice(0, 32);
  const allowed =
    (await consumeAttempt(`login-ip:${ip}`, 20, FIVE_MINUTES)) &&
    (await consumeAttempt(`login:${ip}:${emailKey}`, 5, FIVE_MINUTES));
  if (!allowed) {
    return {
      status: "error",
      message: "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.",
    };
  }

  // Only admin and seller accounts may sign in; same message as a wrong password.
  const [user] = await db.select({ role: users.role }).from(users).where(eq(users.email, email));
  if (!user || !isRole(user.role)) {
    return { status: "error", message: "Correo o contraseña incorrectos." };
  }
  const role = user.role;

  try {
    await auth.api.signInEmail({ body: { email, password }, headers: await headers() });
  } catch (error) {
    if (isAPIError(error) && error.body?.code === "BANNED_USER") {
      return { status: "error", message: "Tu cuenta está desactivada. Contacta a Agrostore." };
    }
    if (isAPIError(error) && error.status === "UNAUTHORIZED") {
      return { status: "error", message: "Correo o contraseña incorrectos." };
    }
    console.error("signIn failed", error);
    return { status: "error", message: "No pudimos iniciar sesión. Inténtalo de nuevo." };
  }

  redirect(safeNext(next, role));
}

export async function signOut() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/");
}
