"use server";

import { isAPIError } from "better-auth/api";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { type ActionState, fieldErrorsFrom } from "@/src/lib/action-state";
import { auth } from "@/src/lib/auth";
import { requireRole } from "@/src/lib/dal";
import { getVendor } from "@/src/lib/data/vendors";
import { parseId } from "@/src/lib/ids";
import {
  type SetPasswordField,
  type VendorField,
  setPasswordSchema,
  vendorCreateSchema,
  vendorUpdateSchema,
} from "@/src/lib/validation/vendor";

type VendorState = ActionState<VendorField>;
type PasswordState = ActionState<SetPasswordField>;

const INVALID = "Revisa los campos marcados.";
const EMAIL_TAKEN = "Ese correo ya está registrado.";

function isEmailTaken(error: unknown) {
  return isAPIError(error) && error.body?.code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL";
}

/** Admin gate + the target must be an existing seller (never an admin). */
async function requireVendorTarget(vendorId: unknown) {
  await requireRole("admin");
  const id = parseId(vendorId);
  if (!id) notFound();
  const vendor = await getVendor(id);
  if (!vendor) notFound();
  return vendor;
}

export async function createVendor(_prev: VendorState, formData: FormData): Promise<VendorState> {
  await requireRole("admin");
  const parsed = vendorCreateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: INVALID, fieldErrors: fieldErrorsFrom(parsed.error) };
  }
  const { email, password, name, farmName, phone, province } = parsed.data;

  try {
    await auth.api.createUser({
      body: { email, password, name, role: "seller", data: { farmName, phone, province } },
      headers: await headers(),
    });
  } catch (error) {
    if (isEmailTaken(error)) {
      return { status: "error", message: INVALID, fieldErrors: { email: EMAIL_TAKEN } };
    }
    console.error("createVendor failed", error);
    return { status: "error", message: "No pudimos crear el vendedor. Inténtalo de nuevo." };
  }
  redirect("/admin/vendedores?ok=creado");
}

export async function updateVendor(
  vendorId: number,
  _prev: VendorState,
  formData: FormData,
): Promise<VendorState> {
  const vendor = await requireVendorTarget(vendorId);
  const parsed = vendorUpdateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: INVALID, fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  try {
    await auth.api.adminUpdateUser({
      body: { userId: String(vendor.id), data: parsed.data },
      headers: await headers(),
    });
  } catch (error) {
    if (isEmailTaken(error)) {
      return { status: "error", message: INVALID, fieldErrors: { email: EMAIL_TAKEN } };
    }
    console.error("updateVendor failed", error);
    return { status: "error", message: "No pudimos guardar los cambios. Inténtalo de nuevo." };
  }
  redirect(`/admin/vendedores/${vendor.id}?ok=guardado`);
}

export async function setVendorPassword(
  vendorId: number,
  _prev: PasswordState,
  formData: FormData,
): Promise<PasswordState> {
  const vendor = await requireVendorTarget(vendorId);
  const parsed = setPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };

  try {
    const h = await headers();
    const userId = String(vendor.id);
    await auth.api.setUserPassword({ body: { userId, newPassword: parsed.data.password }, headers: h });
    await auth.api.revokeUserSessions({ body: { userId }, headers: h });
  } catch (error) {
    console.error("setVendorPassword failed", error);
    return { status: "error", message: "No pudimos cambiar la contraseña. Inténtalo de nuevo." };
  }
  return {
    status: "success",
    message: "Contraseña cambiada. El vendedor debe ingresar de nuevo con la contraseña nueva.",
  };
}

export async function setVendorActive(vendorId: number, active: boolean) {
  const vendor = await requireVendorTarget(vendorId);
  const userId = String(vendor.id);
  const h = await headers();

  if (active) {
    await auth.api.unbanUser({ body: { userId }, headers: h });
  } else {
    // Banning also ends all of the seller's sessions.
    await auth.api.banUser({ body: { userId, banReason: "Desactivado por un administrador" }, headers: h });
  }
  redirect(`/admin/vendedores/${vendor.id}?ok=${active ? "reactivado" : "desactivado"}`);
}
