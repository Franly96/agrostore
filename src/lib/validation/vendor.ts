import { z } from "zod";
import { PROVINCES } from "@/components/agrostore/constants";
import { email, newPassword } from "./fields";

/** "(809) 555-1234", "1-809-555-1234" → "8095551234"; null if not a DR number. */
export function normalizeDrPhone(raw: string): string | null {
  let digits = raw.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
  return /^(809|829|849)\d{7}$/.test(digits) ? digits : null;
}

/** "8095551234" → "809-555-1234" */
export function formatDrPhone(digits: string | null | undefined): string {
  if (!digits || digits.length !== 10) return digits ?? "";
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

const PHONE_MSG = "Escribe los 10 dígitos, ej. 809-555-1234.";

const vendorFields = {
  name: z
    .string({ error: "Escribe el nombre de la persona de contacto." })
    .trim()
    .min(2, { error: "Escribe el nombre de la persona de contacto." })
    .max(80, { error: "Usa como máximo 80 caracteres." }),
  farmName: z
    .string({ error: "Escribe el nombre de la finca o negocio." })
    .trim()
    .min(2, { error: "Escribe el nombre de la finca o negocio." })
    .max(80, { error: "Usa como máximo 80 caracteres." }),
  email,
  phone: z
    .string({ error: PHONE_MSG })
    .transform((v, ctx) => {
      const phone = normalizeDrPhone(v);
      if (!phone) {
        ctx.addIssue({ code: "custom", message: PHONE_MSG });
        return z.NEVER;
      }
      return phone;
    }),
  province: z.enum(PROVINCES, { error: "Elige la provincia." }),
};

export const vendorCreateSchema = z.object({ ...vendorFields, password: newPassword });
export const vendorUpdateSchema = z.object(vendorFields);

export const setPasswordSchema = z
  .object({ password: newPassword, confirmPassword: z.string({ error: "Repite la contraseña." }) })
  .refine((v) => v.password === v.confirmPassword, {
    error: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
  });

export type VendorField = keyof z.input<typeof vendorCreateSchema>;
export type SetPasswordField = keyof z.input<typeof setPasswordSchema>;
