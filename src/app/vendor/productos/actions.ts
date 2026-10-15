"use server";

import { notFound, redirect } from "next/navigation";
import { type ActionState, fieldErrorsFrom } from "@/src/lib/action-state";
import { requireRole } from "@/src/lib/dal";
import { insertSellerProduct, updateSellerProduct } from "@/src/lib/data/products";
import { parseId } from "@/src/lib/ids";
import { type ProductField, productSchema, toProductRow } from "@/src/lib/validation/product";

type State = ActionState<ProductField>;

const INVALID: State = { status: "error", message: "Revisa los campos marcados." };
const FAILED: State = { status: "error", message: "No pudimos guardar el producto. Inténtalo de nuevo." };

export async function createProduct(_prev: State, formData: FormData): Promise<State> {
  const user = await requireRole("seller");
  const parsed = productSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ...INVALID, fieldErrors: fieldErrorsFrom(parsed.error) };

  try {
    await insertSellerProduct(user.id, toProductRow(parsed.data));
  } catch (error) {
    console.error("createProduct failed", error);
    return FAILED;
  }
  redirect("/vendor/productos?ok=creado");
}

export async function updateProduct(
  productId: number,
  _prev: State,
  formData: FormData,
): Promise<State> {
  const user = await requireRole("seller");
  // Bound arguments come from the client and can be tampered with.
  const id = parseId(productId);
  if (!id) notFound();

  const parsed = productSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ...INVALID, fieldErrors: fieldErrorsFrom(parsed.error) };

  let updated: boolean;
  try {
    updated = await updateSellerProduct(user.id, id, toProductRow(parsed.data));
  } catch (error) {
    console.error("updateProduct failed", error);
    return FAILED;
  }
  if (!updated) notFound();
  redirect("/vendor/productos?ok=guardado");
}
