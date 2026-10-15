import { z } from "zod";
import { email, newPassword } from "./fields";

export const loginSchema = z.object({
  email,
  password: z.string({ error: "Escribe tu contraseña." }).min(1, { error: "Escribe tu contraseña." }),
  next: z.string().optional(),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string({ error: "Escribe tu contraseña actual." })
      .min(1, { error: "Escribe tu contraseña actual." }),
    newPassword,
    confirmPassword: z.string({ error: "Repite la contraseña nueva." }),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    error: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
  });

export type LoginField = keyof z.input<typeof loginSchema>;
export type ChangePasswordField = keyof z.input<typeof changePasswordSchema>;
