# Spec 001 — Auth and roles: seller and admin panels

| | |
|---|---|
| Status | **Completed, 2026-10-14** (approved the same day; review answers in §11) |
| Date | 2026-10-14 |
| Scope | Login for sellers and admins; sellers create and edit their products; admins create and edit sellers |
| Depends on | Next.js 16.4 (Cache Components on), Drizzle + Postgres, Zod 4, Agrostore design system |

> **Note (2026-10-14):** all phases are implemented and were verified end to end on a scratch database (Vitest 61/61, lint and `tsc` clean). The **local dev database still has the pre-spec schema**, so sign-in fails there until it is reset as described in §4.4: `docker compose down -v` → `docker compose up -d` → `npx drizzle-kit push` → `npm run seed` → `npm run create-admin` (with `ADMIN_EMAIL`, `ADMIN_NAME` and `ADMIN_PASSWORD` set).

---

## 1. Goals

1. Sellers ("vendedores") and admins can sign in with email and password.
2. A seller can list, create and edit **only their own** products.
3. An admin can list, create and edit sellers, reset a seller's password, and deactivate or reactivate a seller.
4. Every write goes through a **server action** validated with **Zod**, and authorization is checked on the server for every request.
5. The new pages follow the design system and work at 375 / 768 / 1280px, like the rest of the app (see `AGENTS.md`).

### Non-goals (this spec)

- Buyer accounts and public sign-up. Buyers keep browsing without an account.
- Password reset by email, email verification, 2FA, social login. No email provider is set up yet.
- Product photos. Roadmap item 2 adds those separately.
- Deleting products or sellers. Deactivating covers the seller case. Products can be set to stock 0 ("Agotado").
- A UI for creating more admins (§6.6 has a script for that).
- Impersonation, audit log.

---

## 2. Key decisions

| # | Decision | Why | Rejected alternatives |
|---|---|---|---|
| D1 | **Better Auth 1.7** (`better-auth`, latest stable 1.7.8) with the Drizzle adapter, email + password, `admin` plugin and `nextCookies` plugin | Already on the roadmap and listed in the Next docs. Hashes passwords (scrypt), stores sessions in the database, rate-limits sign-in, and the admin plugin gives `createUser`, `adminUpdateUser`, `setUserPassword`, `banUser`/`unbanUser` and roles ready-made. Banning also revokes sessions. | Auth.js: needs more custom work for roles and admin. A hand-rolled session (iron-session/jose + bcrypt): more security-critical code to own. Clerk/Auth0: external service and cost; user data leaves our DB. |
| D2 | **Sign-up disabled** (`emailAndPassword.disableSignUp: true`). Only admins create sellers. The first admin comes from a CLI script. | Matches the brief ("admins create vendors") and blocks spam accounts. | Open sign-up with admin approval: more states to handle, can come later with buyer accounts. |
| D3 | **Keep integer IDs** (`advanced.database.generateId: "serial"`). Better Auth uses our existing `users` table (`usePlural: true`). | `products.seller_id` is already an integer FK to `users.id`, and the public pages join on it. No ID migration. | Better Auth's default string IDs: would mean rewriting the FK and every join. |
| D4 | **Seller profile lives on `users`** as Better Auth `additionalFields`: `farmName`, `phone`, `province` | One write creates a complete seller (`auth.api.createUser({ body: { …, data: { farmName, phone, province } } })`), so there's no half-created seller if a second insert fails. | A separate `seller_profiles` table: cleaner for future buyers, but needs two writes and cleanup on failure. Can be split out later if buyer profiles diverge. |
| D5 | **`role` becomes `text`** (values `admin` \| `seller`; `buyer` reserved). The `role` pg enum is dropped. | The admin plugin writes roles as strings and may store several comma-separated, which a pg enum would reject. Allowed values are enforced by Zod and the DAL. | Keeping the enum: risks write errors inside Better Auth. |
| D6 | **Reads through Drizzle, auth writes through `auth.api.*`** | Reads (lists, joins with product counts) are simpler and typed in Drizzle. Writes that touch passwords, roles, bans or sessions go through Better Auth so its rules (hashing, session revocation) always apply. | Everything through `auth.api.listUsers`: can't join products, and pagination is awkward. |
| D7 | **Authorization in three layers:** (1) `proxy.ts` cookie check only to redirect fast, (2) a **Data Access Layer** (`requireRole`) at the top of every protected page and **every** server action, (3) ownership in the SQL `WHERE` (`seller_id = currentUser.id`) | This is the pattern in the Next authentication guide. Layer 1 can be bypassed, so it never decides access. Layers 2–3 do. Layouts are never used as the guard, since they don't re-run on every navigation and server actions are public endpoints. | Checking in layouts only: unsafe. Checking in the proxy with a DB lookup: runs on every request and prefetch. |
| D8 | **Cache Components pattern:** panel layouts and page headings stay static (part of the static shell). Everything that reads the session sits in an inner async component under `<Suspense>` with a skeleton, the same way `productos/[id]` works today. | With Cache Components, reading cookies/headers outside `<Suspense>` triggers the blocking-route error. This keeps navigations instant. | `export const instant = false` on the panels: allowed by the docs, but throws away the shell. Only a fallback. |
| D9 | **One Zod schema per form, shared by client and server** (`src/lib/validation/*`). The server is the authority; the client runs the same schema before submit for instant errors. | Same rules and the same Spanish messages in both places, with no drift. | Separate client rules (what `ProductForm` has today): would drift from the server. |
| D10 | **URLs:** seller panel at **`/vendor`**, admin at **`/admin`** | `/vendedores/[id]` is already the public seller profile, so a Spanish `/vendedor…` prefix for the private panel would be confusing; the English `/vendor` can't be mixed up with it. Updated 2026-10-14: the panel moved from `/panel` to `/vendor`, and the auth pages from `/ingresar` and `/registro` to `/auth/login` and `/auth/registrar` (future: `/auth/recuperar-contrasena`). | `/vender` (the old placeholder name). |
| D11 | **Stock defaults to 0; "unlimited" is a per-product setting** (`unlimited_stock` boolean) | Review decision Q6. A new product is never accidentally unlimited, and sellers opt in per product. | Nullable `stock` meaning "no limit" (rejected in review). |
| D12 | **Contact details live in one config file with placeholder values** (`src/lib/site-config.ts`) | Review decision Q4. The real WhatsApp/phone/email/hours are added later by changing one file. | Hard-coding them in pages. |

---

## 3. Roles and permissions

| Action | Signed out | Seller | Admin |
|---|---|---|---|
| Browse store (`/`, `/productos/*`) | ✅ | ✅ | ✅ |
| Sign in / sign out | ✅ / — | — / ✅ | — / ✅ |
| `/vendor/**` | → `/auth/login` | ✅ | → `/admin` |
| List / create / edit **own** products | ❌ | ✅ | ❌ |
| Edit another seller's product | ❌ | ❌ (404) | ❌ |
| Change own password | ❌ | ✅ | ✅ |
| `/admin/**` | → `/auth/login` | → `/vendor` | ✅ |
| List / create / edit sellers, set password, deactivate | ❌ | ❌ | ✅ |
| Deactivate self or change own role | — | — | ❌ (blocked) |

A seller who opens another seller's product gets **404**, not 403, so other sellers' product IDs aren't revealed.
A deactivated seller can't sign in, their sessions end right away, and **their products disappear from the public store**.

---

## 4. Data model changes

All in `src/db/schema.ts`. The tables come from `npx auth@latest generate` and are then adjusted to these names and types.

### 4.1 `users` (Better Auth `user`, existing table extended)

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | unchanged |
| `name` | text not null | contact person ("Juan Pérez") |
| `email` | text unique not null | stored lowercase |
| `email_verified` | boolean not null default false | Better Auth |
| `image` | text | Better Auth, unused for now |
| `role` | **text** not null default `'seller'` | was the pg enum, see D5 |
| `banned` | boolean default false | admin plugin; "desactivado" in the UI |
| `ban_reason` | text | admin plugin |
| `ban_expires` | timestamp | admin plugin, unused (bans are indefinite) |
| `farm_name` | text | **new**, public name on products ("Finca El Cacao") |
| `phone` | text | existing; stored as 10 digits (`8095551234`) |
| `province` | text | existing |
| `created_at`, `updated_at` | timestamp not null | `updated_at` is new |

### 4.2 New Better Auth tables

`sessions` (adds `impersonated_by` from the admin plugin), `accounts` (holds the password hash; `provider_id = 'credential'`), `verifications`, `rate_limits` (see §8). These are Better Auth's standard columns with integer `user_id` FKs to `users.id` (`on delete cascade`).

### 4.3 `products` (extended)

| Column | Change |
|---|---|
| `category` | **new**: text not null, one of `CATEGORIES` (`components/agrostore/constants.ts`) |
| `organic` | **new**: boolean not null default false |
| `stock` | unchanged: integer not null **default 0** |
| `unlimited_stock` | **new**: boolean not null default false. When true, `stock` is ignored and the product is always available. When false, `stock = 0` means "Agotado". |
| `updated_at` | **new**: timestamp not null default now |
| `unit`, `province` | unchanged columns; values must come from `UNITS` / `PROVINCES` (enforced by Zod) |

### 4.4 Migration

There are no migration files and the DB only holds seed data, so the plan is to **reset the dev DB** (approved): `docker compose down -v` → `up -d` → `npx drizzle-kit push` → seed. The seed is updated to:
- create the seller "Finca El Cacao" through `auth.api.createUser`, with password `SEED_SELLER_PASSWORD` (default `agro-seller-dev`, dev only);
- give the sample products a `category` and `organic`;
- stay idempotent.

The first real migration file (with `drizzle-kit generate`) is left for the deploy step (roadmap item 4).

---

## 5. Routes and screens

All UI uses `@/components/agrostore`, token classes only, Spanish copy, and the responsive rules in `AGENTS.md`.

| URL | File (under `src/app/`) | Access | Content |
|---|---|---|---|
| `/auth/login` | `auth/login/page.tsx` | public; signed-in users are redirected to their panel | Email + password (`TextField`), "Ingresar" primary button, general error area. Honors `?next=` (§8). |
| `/auth/registrar` | `auth/registrar/page.tsx` | public | Replaced by a short message: "Las cuentas de vendedor las crea el equipo de Agrostore." + WhatsApp, phone, email and hours from `site-config.ts` (placeholders for now) |
| `/vendor` | `vendor/page.tsx` | seller | Redirects to `/vendor/productos` |
| `/vendor/productos` | `vendor/productos/page.tsx` | seller | Own products: name, category, `PriceTag`, stock count, "Sin límite" or `Badge` "Agotado", "Editar" link. Cards on phone, table from `md:`. Empty state with a "Publicar producto" `ButtonLink`. Success banner after save. |
| `/vendor/productos/nuevo` | `vendor/productos/nuevo/page.tsx` | seller | `ProductForm` → `createProduct` |
| `/vendor/productos/[id]` | `vendor/productos/[id]/page.tsx` | seller, owner only | `ProductForm` prefilled → `updateProduct`. 404 if not theirs or invalid ID. |
| `/vendor/cuenta` | `vendor/cuenta/page.tsx` | seller | Read-only profile (farm, phone, province) + change-password form |
| `/admin` | `admin/page.tsx` | admin | Redirects to `/admin/vendedores` |
| `/admin/vendedores` | `admin/vendedores/page.tsx` | admin | Sellers: farm name, contact, email, province, product count, status `Badge` (green "Activo" / danger "Desactivado"). Name/email search (`SearchBar`, GET `?q=`). Cards on phone, table from `md:`. "Nuevo vendedor" button. |
| `/admin/vendedores/nuevo` | `admin/vendedores/nuevo/page.tsx` | admin | `VendorForm`: contact name, farm name, email, phone, province (`Select` with `PROVINCES`), temporary password |
| `/admin/vendedores/[id]` | `admin/vendedores/[id]/page.tsx` | admin | `VendorForm` prefilled (no password) → `updateVendor`. "Cambiar contraseña" section → `setVendorPassword`. "Desactivar / Reactivar" section (`danger` / `secondary` button, with confirmation) → `setVendorActive`. |
| `/admin/cuenta` | `admin/cuenta/page.tsx` | admin | Change own password |
| `/api/auth/[...all]` | `api/auth/[...all]/route.ts` | — | `toNextJsHandler(auth)` (Better Auth endpoints, used for sign-out and session APIs) |

**Layouts.** `vendor/layout.tsx` and `admin/layout.tsx` share one new `components/dashboard-shell.tsx`: on phones, the title and a swipeable row of section links above the content; from `md:`, a sidebar (224px) + content. Both list "Ver tienda" and a "Salir" form button (`signOut` action). Both layouts stay static, with no session read at the top level.

**Header (`components/site-header.tsx`).** The header has **no sign-in button** (removed 2026-10-14; `/auth/login` is reached by URL only for now). It holds `<Suspense fallback={null}><AccountLink/></Suspense>`. `AccountLink` reads the session and renders its own `<li>` with "Mi panel" (seller) or "Admin" (admin), and nothing for visitors, so a signed-out header has no empty flex item. For signed-in users the button appears once the session read resolves, which nudges the items to its left; visitors, the common case, see no shift.

**Public store.** The home grid and product detail:
- show `farm_name ?? name` as the seller;
- skip products whose seller is `banned`;
- show `Badge tone="green"` "Orgánico" when `organic`;
- treat `unlimited_stock` as available with no count; sold out = not unlimited and `stock <= 0`.

---

## 6. Implementation design

### 6.1 Files

```
src/lib/auth.ts                  betterAuth() config (server-only)
src/lib/dal.ts                   getCurrentUser, requireRole, roleHome (server-only)
src/lib/action-state.ts          ActionState type + helpers (fieldErrors from Zod)
src/lib/validation/auth.ts       loginSchema, changePasswordSchema
src/lib/validation/product.ts    productSchema (+ toProductRow: pesos → cents)
src/lib/validation/vendor.ts     vendorCreateSchema, vendorUpdateSchema, setPasswordSchema, phone normalizer
src/lib/data/products.ts         seller-scoped product queries (server-only)
src/lib/data/vendors.ts          admin vendor queries (server-only)
src/lib/site-config.ts           contact details (placeholders until real values are provided)
src/proxy.ts                     optimistic redirect for /vendor, /admin
src/app/api/auth/[...all]/route.ts
src/app/auth/login/{page.tsx, login-form.tsx, actions.ts}
src/app/vendor/…                  pages above + actions.ts per feature + small client form wrappers
src/app/admin/…                  pages above + actions.ts + vendor-form.tsx
components/dashboard-shell.tsx   shared responsive panel layout
components/account-link.tsx      header session-aware link
scripts/create-admin.ts          first admin (npm run create-admin)
```

### 6.2 Better Auth config (`src/lib/auth.ts`)

```ts
import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema, usePlural: true }),
  advanced: { database: { generateId: "serial" } },
  emailAndPassword: { enabled: true, disableSignUp: true, minPasswordLength: 8 },
  user: {
    additionalFields: {
      farmName: { type: "string", required: false, input: false },
      phone:    { type: "string", required: false, input: false },
      province: { type: "string", required: false, input: false },
    },
  },
  rateLimit: { enabled: true, storage: "database" },
  plugins: [admin({ defaultRole: "seller", adminRoles: ["admin"] }), nextCookies()], // nextCookies must be last
});
```

`input: false` means nobody can set profile fields through Better Auth's public endpoints. Only our admin actions set them.
New env vars (`.env`, documented in README): `BETTER_AUTH_SECRET` (`openssl rand -base64 32`) and `BETTER_AUTH_URL=http://localhost:3000`.

### 6.3 Data Access Layer (`src/lib/dal.ts`)

```ts
export type CurrentUser = { id: number; name: string; email: string; role: "admin" | "seller"; farmName: string | null };

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth.api.getSession({ headers: await headers() });
  // map to the narrow DTO above; null if no session or role not admin/seller
});

export async function requireRole(role: "admin" | "seller", from?: string): Promise<CurrentUser>
// no user → redirect(`/auth/login?next=${from}`); wrong role → redirect(roleHome(user.role))
```

- `cache` is React's per-request dedupe. A page, its header link and its action check read the session once per request.
- Only the narrow DTO leaves the DAL. The raw session never goes to client components.
- `use cache: private` (to prefetch the panel per session) is a later optimization, not part of v1. Security checks never read from a cache.

### 6.4 Server action contract

```ts
export type ActionState<F extends string = string> = {
  status: "idle" | "error" | "success";
  message?: string;                               // general error/success text (Spanish)
  fieldErrors?: Partial<Record<F, string>>;       // first message per field from z.flattenError
};
```

Every action follows the same steps, in this order:

1. `const user = await requireRole("seller" | "admin")`. This is the first line, always.
2. `schema.safeParse(Object.fromEntries(formData))`. Invalid → `{ status: "error", fieldErrors }`.
3. Validate any ID passed in (bound argument or hidden field) as a positive int4. Invalid → `notFound()`.
4. Write: Drizzle for products, `auth.api.*` with `headers: await headers()` for users.
5. Map known DB/auth errors to field errors (duplicate email → `email: "Ese correo ya está registrado."`). Anything else returns a general Spanish message and is logged on the server.
6. On success, `redirect()` to the list with `?ok=creado|guardado`. The list page shows a green banner inside its Suspense boundary.

| Action | File | Calls |
|---|---|---|
| `signIn(prev, formData)` | `auth/login/actions.ts` | `loginSchema` → `auth.api.signInEmail`. Any failure → "Correo o contraseña incorrectos." (one message, so it doesn't reveal which emails exist). Banned → "Tu cuenta está desactivada. Contacta a Agrostore." Success → `redirect(safeNext ?? roleHome(role))` |
| `signOut()` | same | `auth.api.signOut({ headers })` → `redirect("/")` |
| `createProduct(prev, fd)` | `vendor/productos/actions.ts` | `productSchema` → insert with `seller_id = user.id` |
| `updateProduct(productId, prev, fd)` | same | `productSchema` → `UPDATE … WHERE id = $id AND seller_id = user.id`; 0 rows → `notFound()` |
| `changePassword(prev, fd)` | `vendor/cuenta/actions.ts` (admin reuses it) | `changePasswordSchema` → `auth.api.changePassword` (`revokeOtherSessions: true`) |
| `createVendor(prev, fd)` | `admin/vendedores/actions.ts` | `vendorCreateSchema` → `auth.api.createUser({ body: { email, password, name, role: "seller", data: { farmName, phone, province } }, headers })` |
| `updateVendor(vendorId, prev, fd)` | same | `vendorUpdateSchema` → check the target is a seller → `auth.api.adminUpdateUser({ body: { userId, data }, headers })` |
| `setVendorPassword(vendorId, prev, fd)` | same | `setPasswordSchema` → `auth.api.setUserPassword` + `revokeUserSessions` |
| `setVendorActive(vendorId, active)` | same | `banUser` (reason "Desactivado por admin") / `unbanUser`. Rejects the admin's own ID. |

Bound arguments (`updateProduct.bind(null, id)`) can be changed by the client, so step 3 plus the ownership `WHERE` are what protect the write.

### 6.5 Zod schemas (Spanish messages, shared client + server)

**`productSchema`** reuses the current `ProductForm` messages:
- `name`: trimmed, 2–80 chars. "Escribe el nombre del producto."
- `category`: `z.enum(CATEGORIES)`. "Elige una categoría."
- `province`: `z.enum(PROVINCES)`. "Elige la provincia."
- `price`: string → number; `"1,200.50"` is accepted (commas stripped); > 0, ≤ 1,000,000, at most 2 decimals. "Indica un precio mayor que 0." Stored as `Math.round(price * 100)` cents.
- `unit`: `z.enum(UNITS)`. "Elige la unidad de venta."
- `stock`: `""` → `0`, otherwise an integer 0–1,000,000. "La cantidad debe ser un número entero."
- `unlimitedStock`: checkbox `"on"` → `true`, missing → `false`. When true, the stock field is disabled in the form and saved as 0.
- `description`: trimmed, ≤ 1,000 chars, `""` → `null`.
- `organic`: checkbox `"on"` → `true`, missing → `false`.

**`vendorCreateSchema`**:
- `name` and `farmName`: 2–80 chars.
- `email`: `z.email()`, lowercased. "Escribe un correo válido."
- `phone`: digits only once normalized, 10 digits starting with 809, 829 or 849. "Escribe los 10 dígitos, ej. 809 555 1234."
- `province`: `z.enum(PROVINCES)`.
- `password`: 8–128 chars.

`vendorUpdateSchema` is the same minus the password.

**`loginSchema`**: email + password, both non-empty.

**`changePasswordSchema` / `setPasswordSchema`**: current password (change only), new password 8–128, confirmation must match. "Las contraseñas no coinciden."

### 6.6 First admin

`scripts/create-admin.ts` (`npm run create-admin`) reads `ADMIN_EMAIL`, `ADMIN_NAME`, `ADMIN_PASSWORD` from the environment and calls `auth.api.createUser({ body: { …, role: "admin" } })`. It's idempotent: it skips if the email already exists. The admin docs show `createUser` without session headers on the server, but they don't say a sessionless call is allowed, so **check it in phase 1**. If it doesn't work, use the context's internal adapter to create the user, with the same hashing.

### 6.7 Component changes

- **`ProductForm`** (`components/agrostore/product-form.tsx`):
  - add `action` (form action from `useActionState`), `pending` and `serverErrors` props;
  - give every input a `name`;
  - add a "Sin límite de cantidad" checkbox next to "Cantidad disponible"; when checked, the quantity field is disabled; the stock hint changes to "Se muestra como Agotado cuando llega a 0.";
  - on submit, run `productSchema` on the client and stop if it fails; otherwise let the form post to the action;
  - server `fieldErrors` replace the client errors.

  Inputs stay controlled, so values survive a failed submit. (React 19 resets uncontrolled forms after an action, so this matters.) The design-system look stays the same. The visible change: the submit button shows "Guardando…" and is disabled while pending.
- **New `VendorForm`** (in `src/app/admin/vendedores/`): built from `TextField` / `Select` / `Button` in the same `ag-form` frame.
- **New `LoginForm`**: `TextField` email (`autoComplete="email"`) + password (`autoComplete="current-password"`), full-width primary button.
- **`DashboardShell`**, **`AccountLink`**, as in §5.

---

## 7. Cache Components and rendering

- `/vendor/**` and `/admin/**` pages each have the shape `static heading → <Suspense fallback={Skeleton}> → <Inner/>`, where `Inner` calls `requireRole` and then loads data. This is the same pattern as `productos/[id]`.
- Pages with `[id]` read `params` inside the same inner component, so there's no top-level `await params`.
- Search pages (`/admin/vendedores?q=`) read `searchParams` inside the inner component.
- The header `AccountLink` is the only session read on public pages, and it's behind its own boundary, so the store pages keep their static shell.
- After a write, the action redirects. Product and vendor lists are uncached (fresh on every request), so nothing needs `updateTag` yet. If the public product list later gets `"use cache"`, the product actions must call `updateTag("products")`.

---

## 8. Security checklist

- [ ] `import "server-only"` in `auth.ts`, `dal.ts` and `data/*`.
- [ ] Every server action calls `requireRole` first. Code review rule: an action without it doesn't merge.
- [ ] Every product query in the panel filters `seller_id = user.id`. Every vendor write checks the target `role = 'seller'`.
- [ ] Every ID from URL, form or bound argument is validated as a positive int4 before it reaches SQL (invalid → 404).
- [ ] `?next=` is only honored if it starts with `/`, doesn't start with `//`, and is a path the user's role may open (prevents open redirects).
- [ ] Passwords are never echoed back in `ActionState` or logs. Password fields get `autoComplete` attributes.
- [ ] One generic login error. Better Auth rate limit on in every environment with **database storage** (works across serverless instances on Vercel) for its HTTP endpoints (`/api/auth/*`).
- [ ] **Implementation finding:** Better Auth's limiter does **not** apply to `auth.api.*` calls made from server actions (tested: 5 wrong-password calls, none limited). The `signIn` action therefore throttles itself (`src/lib/throttle.ts`): 5 attempts per email + IP and 20 per IP per 5 minutes, stored in the same `rate_limits` table under `action:` keys.
- [ ] Session cookie: Better Auth defaults (httpOnly, `secure` in production, `sameSite=lax`). `BETTER_AUTH_SECRET` is required and must not be the dev value in production.
- [ ] Deactivating a seller revokes their sessions (admin plugin) and hides their products from public queries.
- [ ] An admin can't deactivate themselves or change their own role.
- [ ] Server actions keep Next's built-in Origin/Host check. Better Auth `trustedOrigins` = `BETTER_AUTH_URL`.
- [ ] `proxy.ts` only checks that the cookie exists (`getSessionCookie`) and redirects. It is never the access decision.

---

## 9. Phases and acceptance criteria

**Phase 1 — Foundation**
- Install `better-auth`. Add the schema changes and Better Auth tables. Reset the DB, push and seed. Add the auth route handler, `auth.ts`, `dal.ts`, `create-admin` script and env docs.
- ✅ `npm run create-admin` creates an admin. Running it again is a no-op. Seed creates a working seller login. `tsc` and lint pass.

**Phase 2 — Sign in / out**
- `/auth/login` form + actions, `proxy.ts`, `AccountLink` in the header, `DashboardShell` with "Salir", empty `/vendor` and `/admin` landing pages.
- ✅ Seller and admin each land on their own panel. A wrong password shows the generic error. A banned user sees the "desactivada" message. Opening `/vendor/productos` signed out → `/auth/login?next=/vendor/productos`, and after login you're back there. A seller opening `/admin` → `/vendor`. `?next=//evil.com` is ignored.

**Phase 3 — Seller products**
- List, create, edit, `ProductForm` wiring, change password.
- ✅ A seller can create a product, which then shows on the home page with farm name, category and badges. They can edit it. Invalid input shows Spanish field errors from the server even with JavaScript disabled. Seller A opening seller B's `/vendor/productos/[id]` gets a 404. A tampered bound ID can't update another seller's product.

**Phase 4 — Admin sellers**
- List with search, create, edit, set password, deactivate/reactivate.
- ✅ An admin can create a seller, who can then log in. A duplicate email shows a field error. Deactivating logs the seller out within one request, blocks their login, and hides their products from the store. Reactivating restores everything. An admin can't deactivate themselves.

**Phase 5 — Docs and verification**
- Update `README.md` (routes, env vars, data model, roadmap), `AGENTS.md` (auth rules: DAL first line, ownership, schema location) and `CLAUDE.md` architecture notes.
- ✅ Every new page checked at 375 / 768 / 1280px. No dev-overlay Insights. `tsc` + lint pass.

Each phase ends with a working app and can be reviewed on its own.

---

## 10. Testing

The project has no test runner (Q5). Without one:
- **Manual matrix**: every acceptance criterion above, as seller, as admin and signed out, at three widths, plus one run with JavaScript disabled for login and the product form.
- **Security spot checks**: post a server action with another seller's product ID; call `/admin` actions while signed in as a seller; try login rate limiting (4th attempt in 10s is refused).

Approved (Q5): add **Vitest** with unit tests for the Zod schemas (price parsing, phone normalizing, stock and unlimited flag) and for `safeNext`, plus tests that each action rejects the wrong role (DAL mocked).

---

## 11. Review decisions (2026-10-14)

| # | Question | Decision |
|---|---|---|
| Q1 | Seller panel URL | **`/vendor`** |
| Q2 | Can admins edit any seller's products? | **No.** Admins manage sellers only. |
| Q3 | Reset the local DB for the schema change? | **Yes** |
| Q4 | What `/auth/registrar` shows | **Message + contact details as placeholders** (WhatsApp, phone, email, hours) in `src/lib/site-config.ts`; real values added later |
| Q5 | Add Vitest? | **Yes**: schemas, `safeNext`, role checks |
| Q6 | Empty stock = unlimited? | **No.** Stock defaults to **0**; "unlimited" is a **per-product option** (`unlimited_stock`, D11) |
| Q7 | Separate farm name from contact name? | **Yes** |
| Q8 | Hide a deactivated seller's products? | **Yes** |

---

## References

- Next.js docs bundled in `node_modules/next/dist/docs/01-app/02-guides/`: `authentication.md` (DAL, proxy optimistic checks, server action auth), `authentication-with-cache-components.md` (session reads behind Suspense, `use cache: private`), `forms.md` (`useActionState`).
- Better Auth: [Next.js integration](https://www.better-auth.com/docs/integrations/next), [Admin plugin](https://www.better-auth.com/docs/plugins/admin), [Database / serial IDs](https://www.better-auth.com/docs/concepts/database), [Email & password](https://www.better-auth.com/docs/authentication/email-password), [Rate limit](https://www.better-auth.com/docs/concepts/rate-limit).
