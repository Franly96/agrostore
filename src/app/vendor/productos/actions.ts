"use server";

import { notFound, redirect } from "next/navigation";
import { after } from "next/server";
import { type ActionState, fieldErrorsFrom } from "@/src/lib/action-state";
import { requireRole } from "@/src/lib/dal";
import { insertSellerProduct, PhotoInUseError, updateSellerProduct } from "@/src/lib/data/products";
import { parseId } from "@/src/lib/ids";
import { removeBlobs, verifyUploads } from "@/src/lib/images/blob-store";
import { isOwnPathname } from "@/src/lib/images/paths";
import { type ProductField, productSchema, toProductRow } from "@/src/lib/validation/product";

type State = ActionState<ProductField>;

const INVALID: State = { status: "error", message: "Revisa los campos marcados." };
const FAILED: State = { status: "error", message: "No pudimos guardar el producto. Inténtalo de nuevo." };
const BAD_PHOTOS: State = {
  ...INVALID,
  fieldErrors: { images: "Las fotos no son válidas. Súbelas de nuevo." },
};

type Parsed = { ok: true; data: ReturnType<typeof productSchema.parse> } | { ok: false; state: State };

/** Validates the form, then checks every photo is the seller's own upload in our store. */
async function parseProductForm(sellerId: number, formData: FormData): Promise<Parsed> {
  const parsed = productSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, state: { ...INVALID, fieldErrors: fieldErrorsFrom(parsed.error) } };
  try {
    const ownPhotos = await verifyUploads(parsed.data.images, (p) => isOwnPathname(p, sellerId));
    if (!ownPhotos) return { ok: false, state: BAD_PHOTOS };
  } catch (error) {
    console.error("photo check failed", error);
    return { ok: false, state: FAILED };
  }
  return { ok: true, data: parsed.data };
}

export async function createProduct(_prev: State, formData: FormData): Promise<State> {
  const user = await requireRole("seller");
  const form = await parseProductForm(user.id, formData);
  if (!form.ok) return form.state;

  try {
    await insertSellerProduct(user.id, toProductRow(form.data), form.data.images);
  } catch (error) {
    if (error instanceof PhotoInUseError) return BAD_PHOTOS;
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

  const form = await parseProductForm(user.id, formData);
  if (!form.ok) return form.state;

  let removed: string[] | null;
  try {
    removed = await updateSellerProduct(user.id, id, toProductRow(form.data), form.data.images);
  } catch (error) {
    if (error instanceof PhotoInUseError) return BAD_PHOTOS;
    console.error("updateProduct failed", error);
    return FAILED;
  }
  if (!removed) notFound();
  // Photos taken out of the product are deleted from storage after the response.
  const toDelete = removed;
  after(() => removeBlobs(toDelete));
  redirect("/vendor/productos?ok=guardado");
}
