import { z } from "zod";

/** HTML checkbox: "on" (form post) or true (client state) → true; missing → false. */
export const checkbox = z
  .union([z.literal("on"), z.literal("true"), z.boolean()])
  .optional()
  .transform((v) => v === "on" || v === "true" || v === true);

export const email = z
  .string({ error: "Escribe tu correo." })
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: "Escribe un correo válido, ej. nombre@correo.com." }));

export const newPassword = z
  .string({ error: "Escribe una contraseña." })
  .min(8, { error: "Usa al menos 8 caracteres." })
  .max(128, { error: "Usa como máximo 128 caracteres." });
