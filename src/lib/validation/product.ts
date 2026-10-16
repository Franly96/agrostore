import { z } from "zod";
import { CATEGORIES, PROVINCES, UNITS } from "@/components/agrostore/constants";
import { MAX_IMAGES } from "@/src/lib/images/paths";
import { checkbox } from "./fields";

const MAX_PRICE = 1_000_000;
const MAX_STOCK = 1_000_000;
const PRICE_MSG = "Indica un precio mayor que 0.";
const STOCK_MSG = "La cantidad debe ser un número entero, ej. 50.";

const PHOTO_MSG = "Las fotos no son válidas. Súbelas de nuevo.";

/** One uploaded photo as the browser reports it. Ownership is checked in the action. */
export const photoSchema = z.object({
  url: z.string({ error: PHOTO_MSG }).max(500, { error: PHOTO_MSG }),
  pathname: z.string({ error: PHOTO_MSG }).min(1, { error: PHOTO_MSG }).max(300, { error: PHOTO_MSG }),
  width: z.number({ error: PHOTO_MSG }).int({ error: PHOTO_MSG }).min(1, { error: PHOTO_MSG }).max(4000, { error: PHOTO_MSG }),
  height: z.number({ error: PHOTO_MSG }).int({ error: PHOTO_MSG }).min(1, { error: PHOTO_MSG }).max(4000, { error: PHOTO_MSG }),
});
export type PhotoInput = z.infer<typeof photoSchema>;

export const productSchema = z.object({
  name: z
    .string({ error: "Escribe el nombre del producto." })
    .trim()
    .min(2, { error: "Escribe el nombre del producto." })
    .max(80, { error: "Usa como máximo 80 caracteres." }),
  category: z.enum(CATEGORIES, { error: "Elige una categoría." }),
  province: z.enum(PROVINCES, { error: "Elige la provincia." }),
  price: z
    .string({ error: PRICE_MSG })
    .trim()
    .transform((s) => s.replace(/,/g, ""))
    .pipe(
      z
        .string()
        .min(1, { error: PRICE_MSG })
        .regex(/^\d+(\.\d{1,2})?$/, { error: "Usa un número con hasta 2 decimales, ej. 45.50." }),
    )
    .transform(Number)
    .pipe(
      z
        .number()
        .gt(0, { error: PRICE_MSG })
        .max(MAX_PRICE, { error: "El precio máximo es RD$ 1,000,000." }),
    ),
  unit: z.enum(UNITS, { error: "Elige la unidad de venta." }),
  unlimitedStock: checkbox,
  // A disabled field (unlimited stock) isn't posted, so missing or empty means 0.
  stock: z
    .string()
    .trim()
    .optional()
    .transform((v) => v ?? "")
    .pipe(z.string().regex(/^\d*$/, { error: STOCK_MSG }))
    .transform((v) => (v === "" ? 0 : Number(v)))
    .pipe(z.number().max(MAX_STOCK, { error: "La cantidad máxima es 1,000,000." })),
  description: z
    .string()
    .trim()
    .max(1000, { error: "Usa como máximo 1,000 caracteres." })
    .optional()
    .transform((v) => (v ? v : null)),
  organic: checkbox,
  // Hidden JSON field from the photo uploader, in display order (first = cover).
  images: z
    .string()
    .optional()
    .transform((v, ctx) => {
      if (!v) return [];
      try {
        return JSON.parse(v) as unknown;
      } catch {
        ctx.issues.push({ code: "custom", message: PHOTO_MSG, input: v });
        return z.NEVER;
      }
    })
    .pipe(
      z
        .array(photoSchema, { error: PHOTO_MSG })
        .max(MAX_IMAGES, { error: `Solo puedes subir hasta ${MAX_IMAGES} fotos.` }),
    ),
});

export type ProductField = keyof z.input<typeof productSchema>;
export type ProductInput = z.output<typeof productSchema>;

/** Maps validated form input to `products` columns (pesos → centavos). */
export function toProductRow(input: ProductInput) {
  return {
    name: input.name,
    category: input.category,
    province: input.province,
    priceCents: Math.round(input.price * 100),
    unit: input.unit,
    stock: input.unlimitedStock ? 0 : input.stock,
    unlimitedStock: input.unlimitedStock,
    description: input.description,
    organic: input.organic,
  };
}

export type ProductDraft = {
  name: string;
  category: string;
  province: string;
  price: string;
  unit: string;
  stock: string;
  unlimitedStock: boolean;
  description: string;
  organic: boolean;
  /** JSON array of photos (see `photoSchema`). */
  images: string;
};

/** Client-side check with the same schema the server action uses. */
export function validateProductDraft(draft: ProductDraft): Partial<Record<ProductField, string>> {
  const result = productSchema.safeParse({
    ...draft,
    stock: draft.unlimitedStock ? "" : draft.stock,
  });
  if (result.success) return {};
  const out: Partial<Record<ProductField, string>> = {};
  for (const issue of result.error.issues) {
    const key = issue.path[0] as ProductField;
    if (key && !(key in out)) out[key] = issue.message;
  }
  return out;
}

/** DB row → form draft (centavos → pesos string). */
export function productToDraft(p: {
  name: string;
  category: string;
  province: string | null;
  priceCents: number;
  unit: string;
  stock: number;
  unlimitedStock: boolean;
  description: string | null;
  organic: boolean;
  images?: PhotoInput[];
}): ProductDraft {
  return {
    name: p.name,
    category: p.category,
    province: p.province ?? "",
    price: String(p.priceCents / 100),
    unit: p.unit,
    stock: String(p.stock),
    unlimitedStock: p.unlimitedStock,
    description: p.description ?? "",
    organic: p.organic,
    images: JSON.stringify(
      (p.images ?? []).map(({ url, pathname, width, height }) => ({ url, pathname, width, height })),
    ),
  };
}
