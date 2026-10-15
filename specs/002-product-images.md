# Spec 002 — Product images

| | |
|---|---|
| Status | **Draft, awaiting review** |
| Date | 2026-10-14 |
| Scope | Sellers upload up to 5 photos per product; the store shows them on cards and the detail page |
| Depends on | Spec 001 (seller panel, `requireRole`), a Vercel project with a Blob store (spec 004, phase 1) |

---

## 1. Goals

1. A seller can add, reorder and remove up to **5 photos** per product from `/vendor/productos/nuevo` and `/vendor/productos/[id]`.
2. Photos upload from a phone over a weak connection without failing. Most sellers list from the field.
3. The home grid and product detail show the photos, sized for each screen. The detail page has a swipeable gallery.
4. Only the owning seller can attach photos to their products. Nobody can upload without being signed in as a seller.
5. Unused uploads are cleaned up automatically.

### Non-goals

- Seller avatars, farm cover photos, admin-uploaded images.
- Video.
- Automatic moderation (nudity/spam detection). Open question Q4 covers manual moderation.
- Editing photos (crop, filters) beyond the automatic resize.

---

## 2. Key decisions

| # | Decision | Why | Rejected alternatives |
|---|---|---|---|
| D1 | **Vercel Blob, public store** (`@vercel/blob`) | The app deploys to Vercel (spec 004), so it's one account and one bill, with no extra vendor. Client uploads send files straight from the browser to storage, so they skip the 4.5 MB function body limit and the server bandwidth. Public URLs are served by Vercel's CDN. Product photos are public anyway. | **Cloudinary**: strong transforms, but a separate account. Its free tier is credit-based, and reviews report accounts being blocked when the quota runs out. Paid plans start at $99/month. **UploadThing**: another vendor. **S3/R2**: more setup (IAM, CORS, presigning) for the same result. |
| D2 | **Resize in the browser before uploading** (long edge 1600px, WebP ≈0.82 quality, JPEG fallback) | Phone photos are 3–12 MB. Shrinking them on the device first makes uploads 10–20× smaller, which matters on rural mobile data, and keeps storage costs low. | Uploading originals and resizing on the server: slow uploads on 3G/4G, and paying to store full-size originals. |
| D3 | **Don't rely on `onUploadCompleted`.** The browser gets the blob URL back and sends it with the product form. The server action checks it before saving. | Vercel Blob can't call back to `localhost` (the docs require an ngrok tunnel), and the form needs the URL in hand anyway. Saving happens in the same `updateProduct` / `createProduct` action, so a product and its photos are written together. | Saving in `onUploadCompleted`: breaks local development, and the row would be written before the product exists. |
| D4 | **Uploads are scoped by path: `products/{sellerId}/…`.** The token route only issues tokens for the signed-in seller's own prefix, and the save action only accepts URLs under that prefix. | A seller can't attach another seller's photos, or arbitrary internet URLs, to their product. | Trusting any URL from the form. |
| D5 | **New `product_images` table** (ordered, max 5); `products.image_url` is dropped | Several photos with an order and a cover photo (`position = 0`). Storing the blob `pathname` lets us delete files reliably. | A JSON column on `products`: harder to query and to clean up. |
| D6 | **Display with `next/image`**, with the Blob host in `images.remotePatterns` | Responsive `srcset`, lazy loading and AVIF/WebP for each device. The cost is Vercel Image Optimization transformations (Hobby includes 5K/month; Pro is usage-based at $0.05 per 1K). | Plain `<img>` (what we have now): sends the same size to every device. |
| D7 | **Separate Blob stores for development and production** | Local testing never touches production files. | One shared store. |

**Free-tier note (spec 004, §2a):** during the free build and beta stages, Vercel Hobby allows 1 GB of Blob storage, 2,000 uploads and 5K image transformations per month. At ~300 KB per resized photo, that's room for thousands of photos, so it's enough for the beta. If a limit is exceeded, Blob is blocked for 30 days, so the public launch happens on Pro.

---

## 3. Data model

New table `product_images`:

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `product_id` | int not null → `products.id` on delete cascade | |
| `seller_id` | int not null → `users.id` | denormalized for the ownership check and cleanup |
| `pathname` | text not null unique | `products/{sellerId}/{random}.webp`; used for `del()` |
| `url` | text not null | public Blob URL |
| `width`, `height` | int not null | from the browser resize; lets `next/image` reserve the space (no layout shift) |
| `position` | smallint not null | 0 = cover; unique per `(product_id, position)` |
| `created_at` | timestamp not null default now | |

`products.image_url` is removed. It's always null today, so nothing needs migrating.

---

## 4. Upload flow

```
Seller picks photos ──► browser resizes (canvas) ──► upload() ──► POST /api/uploads/product-image
                                                                  │  onBeforeGenerateToken:
                                                                  │   getCurrentUser() must be a seller
                                                                  │   pathname must start with products/{user.id}/
                                                                  │   allowed types: image/webp, image/jpeg
                                                                  │   max 4 MB, addRandomSuffix
                                                                  ◄── client token
                       browser ──► Vercel Blob (direct) ──► { url, pathname }
Seller presses "Guardar" ──► server action (createProduct / updateProduct)
                               requireRole("seller")
                               validate images[] (Zod): ≤5, url host = our Blob store,
                                 pathname prefix products/{user.id}/, head() confirms the file exists
                               transaction: upsert product + replace its product_images rows
                               after(): del() blobs removed from this product
```

- **Token route** `src/app/api/uploads/product-image/route.ts`: `handleUpload` from `@vercel/blob/client`. This is a Route Handler, not a server action, so it returns `401`/`403` JSON instead of redirecting. It's rate-limited with `consumeAttempt` (60 tokens per seller per hour).
- **Client component** `ImageUploader` (new, in `components/agrostore/`):
  - pick from camera or gallery (`<input type="file" accept="image/*" multiple>`);
  - shows a thumbnail grid, with progress per photo (`onUploadProgress`), a retry button on failure, remove, "Usar como portada" (move to the front) and reorder;
  - accessible: buttons with labels, not drag-only.

  It sends the result to `ProductForm` as hidden `images` JSON.
- **Resize helper** `src/lib/images/resize.ts`: `createImageBitmap` with `imageOrientation: "from-image"` (fixes rotated phone photos), then `OffscreenCanvas` or `<canvas>`, then `toBlob("image/webp", 0.82)`. It falls back to JPEG when the browser can't encode WebP. It returns `{ blob, width, height }`.
- **Limits**:
  - 5 photos per product;
  - originals up to 25 MB are accepted for resizing; the upload after resize is capped at 4 MB;
  - minimum 600px on the short edge, or the error "La foto es muy pequeña".
- **Errors** (Spanish): "No pudimos subir la foto. Revisa tu conexión e inténtalo de nuevo."; "Solo puedes subir hasta 5 fotos."; "Ese archivo no es una foto."
- **Saving while uploads are pending**: the submit button is disabled with "Subiendo fotos…" until every upload is done or removed.

### Things to verify in phase 1 (not confirmed yet)

- iPhone HEIC photos: whether Safari hands the page a JPEG it can decode, or a HEIC that `createImageBitmap` can't read. If it can't, show "Toma la foto con la cámara desde aquí" and use `capture`.
- WebP encoding support in `canvas.toBlob` on the phones sellers use (older Safari, low-end Android). The JPEG fallback covers this.

---

## 5. Display

| Where | What |
|---|---|
| Home grid (`ProductCard`) | Cover photo, 4:3, `sizes="(min-width:1024px) 240px, (min-width:768px) 33vw, 50vw"`. The leaf placeholder stays for products without photos. |
| Product detail | Gallery: main 4:3 image plus thumbnails. On phones it's a horizontal scroll-snap strip with dots ("Foto 2 de 4"). From `md:`, thumbnails sit under the main image. The cover gets `priority` (it's the LCP element). |
| Seller list (`/vendor/productos`) | 48px cover thumbnail on each row/card |
| Cart (spec 003) | 72px thumbnail in `CartItem` |

- `ProductCard` and `CartItem` (design system) gain an optional `image` slot (ReactNode), so the app passes a `next/image` element while the components stay framework-free. Their existing `imageSrc` keeps working.
- `alt`: the product name (cover) and "{name}, foto {n}" for the others.
- `next.config.ts`: `images.remotePatterns` for the production and development Blob hostnames (`https://<store-id>.public.blob.vercel-storage.com/products/**`).

---

## 6. Deleting and cleanup

- Removing a photo in the form deletes its row on save. The blob is deleted after the response with `after(() => del(pathnames))`.
- **Orphans** (uploaded but never saved, e.g. the seller closed the tab) are handled by a daily Vercel Cron job (`/api/cron/cleanup-images`). It lists `products/` blobs older than 24 hours with no `product_images` row and deletes them. The job is protected with `CRON_SECRET` (spec 004).
- Deactivating a seller keeps their photos, so reactivation restores the listing.

---

## 7. Security checklist

- [ ] Token route: signed-in **seller** only; pathname prefix `products/{user.id}/`; content types webp/jpeg; 4 MB max; rate limited.
- [ ] Save action: every image URL is on our Blob host, under the seller's own prefix, and exists (`head()`). At most 5. Width/height are positive integers ≤ 4000.
- [ ] `BLOB_READ_WRITE_TOKEN` stays server-side only (never `NEXT_PUBLIC_`).
- [ ] The cron route checks `Authorization: Bearer ${CRON_SECRET}`.
- [ ] `remotePatterns` lists only our store hostnames, never a wildcard over all of `*.vercel-storage.com`.

---

## 8. Phases and acceptance criteria

**Phase 1 — Storage and upload**
- Create the dev Blob store and add `BLOB_READ_WRITE_TOKEN` to `.env`. Build the token route, resize helper and `ImageUploader`. Verify HEIC/WebP on a real iPhone and Android phone.
- ✅ A seller can upload a phone photo on 4G. The stored file is ≤ 1600px and well under 1 MB. A signed-out request to the token route gets 401. A seller can't request a token for another seller's prefix.

**Phase 2 — Save with products**
- `product_images` table; form wiring; save/replace in the product actions; delete removed blobs.
- ✅ Add, reorder, set cover and remove all persist after saving. A tampered `images` field (a foreign URL or another seller's path) is rejected with a Spanish error.

**Phase 3 — Store display**
- `next/image` on cards, detail gallery and seller list; `remotePatterns`.
- ✅ Photos show at 375 / 768 / 1280px with no layout shift. The detail gallery swipes on phones. No dev-overlay Insights.

**Phase 4 — Cleanup**
- Orphan cleanup cron (runs once deployed, spec 004).
- ✅ An upload not saved within 24 hours is deleted on the next run. Saved photos are never touched.

---

## 9. Testing

- Vitest: the image-list Zod schema (host, prefix, count, sizes); the pathname-prefix check used by the token route.
- Manual: real phones (iPhone Safari, mid-range Android Chrome) on mobile data; airplane mode mid-upload (retry); 5-photo limit; reorder with keyboard only.

---

## 10. Open questions (my recommended answer in **bold**)

| # | Question | Recommendation |
|---|---|---|
| Q1 | Vercel Blob or Cloudinary? | **Vercel Blob** (D1) |
| Q2 | Maximum photos per product | **5** |
| Q3 | Should a product require at least one photo to be published? | **No**, keep the leaf placeholder. Many sellers will add photos later. |
| Q4 | Should admins be able to remove a seller's photo (inappropriate content)? | **Yes, in a later spec** with an admin product view. Until then, deactivating the seller hides everything. |
| Q5 | Keep originals as well as the resized copy? | **No**: only the resized copy is stored |

---

## References

- Vercel Blob: [client uploads](https://vercel.com/docs/vercel-blob/client-upload), [pricing and limits](https://vercel.com/docs/vercel-blob/usage-and-pricing)
- Vercel image optimization included usage: [fair use guidelines](https://vercel.com/docs/limits/fair-use-guidelines)
- Next.js `next/image` and `remotePatterns`: `node_modules/next/dist/docs/01-app/03-api-reference/02-components/image.md`
