# AgroStore

Online store for agricultural products in the Dominican Republic local market. Sellers (fincas, producers) list their products; buyers browse and order them. UI is in Spanish, prices are in Dominican pesos (RD$).

> **Status:** early prototype. The home page lists products from the database, and each card opens its detail page. Sellers and admins can sign in: sellers manage their own products in `/panel`, admins manage sellers in `/admin` (spec: [`specs/001-auth-and-roles.md`](specs/001-auth-and-roles.md)). Catalog, cart, checkout and orders are still placeholders. See [Roadmap](#roadmap).

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16.4 (App Router, Turbopack) with Cache Components enabled |
| UI | React 19, Tailwind CSS v4, Agrostore design system (`components/agrostore`), Figtree font; shadcn/ui available for extra primitives |
| Database | PostgreSQL 17 (Docker for local dev) |
| ORM | Drizzle ORM + drizzle-kit, `postgres` (postgres.js) driver |
| Auth | Better Auth 1.7 (email + password, admin plugin), database sessions |
| Validation | Zod 4 (shared client/server schemas in `src/lib/validation/`) |
| Tests | Vitest (`npm test`) |
| Language | TypeScript |

## Getting started

Prerequisites: Node.js 20+, Docker Desktop.

```bash
# 1. Install dependencies
npm install

# 2. Start Postgres (user/password/db: agro / agro / agrostore on port 5432)
docker compose up -d

# 3. Create .env in the project root
cat > .env <<ENV
DATABASE_URL=postgres://agro:agro@localhost:5432/agrostore
BETTER_AUTH_SECRET=$(openssl rand -base64 32)
BETTER_AUTH_URL=http://localhost:3000
ENV

# 4. Create the tables from src/db/schema.ts
npx drizzle-kit push

# 5. Load sample data (seller finca@example.com / agro-seller-dev, two products)
npm run seed

# 6. Create your admin account
ADMIN_EMAIL=you@example.com ADMIN_NAME="Your Name" ADMIN_PASSWORD=choose-a-password npm run create-admin

# 7. Run the dev server
npm run dev
```

Open http://localhost:3000 and sign in at `/ingresar`. There is no public sign-up: admins create sellers in `/admin/vendedores`.

The seed is safe to run more than once; it skips data that already exists. To start over with an empty database, run `docker compose down -v` (this deletes the database volume) and repeat steps 2, 4, 5 and 6.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on port 3000 |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` | ESLint |
| `npx drizzle-kit push` | Sync the schema to the database |
| `npx drizzle-kit studio` | Browse the database in a web UI |
| `npm run seed` | Insert sample data (`SEED_SELLER_PASSWORD` overrides the seller's password) |
| `npm run create-admin` | Create an admin from `ADMIN_EMAIL`, `ADMIN_NAME`, `ADMIN_PASSWORD` (skips if the email exists) |
| `npm test` | Vitest unit tests (validation, redirects, action authorization) |

## Project structure

```
src/
  app/
    layout.tsx         Root layout (Geist fonts, metadata, title template)
    not-found.tsx      404 page
    (tienda)/          Storefront pages + header/footer layout (see Routes)
    (auth)/            Sign in (/ingresar) and "sell with us" contact page (/registro)
    panel/             Seller area: products, account
    admin/             Admin area: sellers, account
    api/auth/          Better Auth HTTP handler
    globals.css        Tailwind v4 + shadcn theme variables
  db/
    schema.ts          Drizzle tables: users, auth tables (sessions, accounts, verifications, rate_limits), products
    index.ts           Drizzle client (reads DATABASE_URL)
    seed.ts            Sample data
  lib/
    auth.ts            Better Auth instance (auth-options.ts holds the shared config)
    dal.ts             getCurrentUser / requireRole: the authorization gate
    auth-actions.ts    signIn / signOut server actions
    data/              Server-only queries (seller products, vendors, store filters)
    validation/        Zod schemas shared by forms and server actions
    site-config.ts     Contact details (placeholders)
  proxy.ts             Redirects signed-out visitors away from /panel and /admin
components/            App chrome: site-header, site-footer, dashboard-shell, account-link, forms
components/agrostore/  Design-system components + agrostore.css
components/ui/         shadcn components (button, card, input) + product-list.tsx
                       (ProductList DB query + ProductListSkeleton)
lib/utils.ts           cn() helper
docker-compose.yml     Local Postgres
drizzle.config.ts      drizzle-kit config
scripts/create-admin.ts  First admin account
specs/                 Feature specs
test/                  Cross-module tests (action authorization)
next.config.ts         cacheComponents, partialPrefetching, Tailwind loader
```

## Routes

All URLs are in Spanish. Route groups `(tienda)` and `(auth)` share layouts without appearing in the URL.

| URL | File | Purpose |
|---|---|---|
| `/` | `src/app/(tienda)/page.tsx` | Home: product list |
| `/productos` | `(tienda)/productos/page.tsx` | Catalog with search/filters |
| `/productos/[id]` | `(tienda)/productos/[id]/page.tsx` | Product detail |
| `/vendedores/[id]` | `(tienda)/vendedores/[id]/page.tsx` | Seller profile |
| `/carrito` | `(tienda)/carrito/page.tsx` | Shopping cart |
| `/pagar` | `(tienda)/pagar/page.tsx` | Checkout |
| `/pedidos` | `(tienda)/pedidos/page.tsx` | Buyer's orders |
| `/pedidos/[id]` | `(tienda)/pedidos/[id]/page.tsx` | Order detail / confirmation |
| `/cuenta` | `(tienda)/cuenta/page.tsx` | Account profile |
| `/ingresar` | `(auth)/ingresar/page.tsx` | Sign in |
| `/registro` | `(auth)/registro/page.tsx` | How to become a seller (contact placeholders) |
| `/panel/productos` | `panel/productos/page.tsx` | Seller: own products (seller only) |
| `/panel/productos/nuevo` | `panel/productos/nuevo/page.tsx` | Seller: publish a product |
| `/panel/productos/[id]` | `panel/productos/[id]/page.tsx` | Seller: edit own product |
| `/panel/cuenta` | `panel/cuenta/page.tsx` | Seller: profile + change password |
| `/admin/vendedores` | `admin/vendedores/page.tsx` | Admin: sellers list + search |
| `/admin/vendedores/nuevo` | `admin/vendedores/nuevo/page.tsx` | Admin: create seller |
| `/admin/vendedores/[id]` | `admin/vendedores/[id]/page.tsx` | Admin: edit seller, set password, deactivate |
| `/admin/cuenta` | `admin/cuenta/page.tsx` | Admin: change password |

Layouts: `(tienda)/layout.tsx` adds the site header and footer; `(auth)/layout.tsx` centers a card; `panel/layout.tsx` and `admin/layout.tsx` use `components/dashboard-shell.tsx`. Unknown URLs render `src/app/not-found.tsx`. `/` and `/productos/[id]` show real data; the rest are placeholders. Product cards on the home page link to their detail page.

## Data model

- **users**: `id`, `name` (contact person), `email` (unique), `role` (`admin` | `seller`), `farmName` (public seller name), `phone` (10 digits), `province`, `banned` (deactivated), Better Auth fields (`emailVerified`, `image`, `banReason`, `banExpires`), `createdAt`, `updatedAt`
- **sessions**, **accounts** (password hash), **verifications**, **rate_limits**: Better Auth tables
- **products**: `id`, `sellerId` → users.id, `name`, `description`, `category`, `organic`, `priceCents`, `unit`, `stock` (default 0), `unlimitedStock`, `province`, `imageUrl`, `createdAt`, `updatedAt`

Prices are stored as integer **centavos** of DOP (`25000` = RD$ 250.00). `category`, `unit` and `province` come from the lists in `components/agrostore/constants.ts`. A product is sold out ("Agotado") when it isn't `unlimitedStock` and `stock` is 0. Products of deactivated sellers are hidden from the store.

## Auth and roles

| | Seller | Admin |
|---|---|---|
| Signs in at | `/ingresar` → `/panel/productos` | `/ingresar` → `/admin/vendedores` |
| Can | List, publish and edit **own** products; change own password | Create and edit sellers, set their password, deactivate/reactivate them; change own password |

- Accounts: no public sign-up. The first admin comes from `npm run create-admin`; admins create sellers.
- Sessions: Better Auth database sessions in an httpOnly cookie. Deactivating a seller ends their sessions.
- Env: `BETTER_AUTH_SECRET` (required; use a new random value per environment) and `BETTER_AUTH_URL`.
- Contact details shown to sellers (WhatsApp, phone, email, hours) live in `src/lib/site-config.ts` and are **placeholders** until real values are filled in.

## Design system

The UI follows the **Agrostore design system** (white-first, green as the brand colour, Figtree, Spanish copy). Tokens live in `src/app/globals.css`; components in `components/agrostore/`.

**Tokens → Tailwind classes**

| Token | Value | Class examples | Use |
|---|---|---|---|
| surface | #ffffff | `bg-surface` | Page, cards, header |
| surface-soft | #f4f8f2 | `bg-surface-soft` | Alternate sections, footer |
| ink | #1f2a1d | `text-ink` | Main text |
| ink-muted | #5b6658 | `text-ink-muted` | Secondary text, units, province |
| line | #dfe7da | `border-line` | Hairline borders |
| green-600 | #2e7d32 | `bg-green-600`, `text-green-600` | Actions, links, selected |
| green-800 | #1b5e20 | `hover:bg-green-800` | Hover/pressed; text on green-100 |
| green-100 | #e3f1e1 | `bg-green-100` | Chips, positive badges, tints |
| mango | #f2a33a | `bg-mango` | "Oferta" only, with ink text |
| danger | #c62828 | `text-danger` | Errors, "Agotado" |

Type: `text-display` (40/44 800), `text-heading` (28/34 700), `text-title` (20/26 600), `text-body` (16/24), `text-body-sm` (14/20), `text-price` (18/24 700), `text-label` (12/16 600). Radius: `rounded-sm` 6px (inputs, badges), `rounded-md` 12px (cards, panels), `rounded-pill` (buttons, chips). Spacing: Tailwind `1 / 2 / 4 / 6` = 4 / 8 / 16 / 24px, the design system's `space-1/2/4/6`.

**Components** (`import { … } from "@/components/agrostore"`): `Button`, `ButtonLink`, `Badge`, `PriceTag`, `QuantityStepper`, `SearchBar`, `ProductCard`, `TextField`, `Select`, `CategoryChips`, `CartItem`, `ProductForm`, plus `formatRD`, `centsToPesos`, `PROVINCES`, `CATEGORIES`, `UNITS`. Their styles are in `components/agrostore/agrostore.css` (copied from the design system's stylesheet). shadcn's colour variables (`--primary`, `--border`, `--ring`, …) are mapped to the same tokens, so shadcn components added later match.

## Responsive design

Every page must look right on three screen sizes. Design for the phone first (most buyers and sellers use one), then add tablet and desktop styles with Tailwind's `md:` and `lg:` prefixes.

| Size | Width | Test at | Tailwind |
|---|---|---|---|
| Phone | up to 767px | 375px (also check 360px) | no prefix |
| Tablet | 768–1023px | 768px | `md:` |
| Desktop | 1024px and up | 1280px | `lg:` |

How the current layouts adapt:

| Area | Phone | Tablet | Desktop |
|---|---|---|---|
| Header | Logo, Carrito, Ingresar on top; other links in a swipeable row below | One row, all links | One row, all links |
| Home product grid | 2 columns | 3 columns | 4 columns |
| Product detail | Photo above details | Photo and details side by side | Side by side |
| Seller and admin panels | Top bar + section links in a swipeable row | Sidebar on the left | Sidebar on the left |
| Panel lists (products, sellers) | Stacked cards | Table | Table |
| Product form | Fields stacked in one column (under 480px) | Two-column rows | Two-column rows |
| Page gutter | 16px (`px-4`) | 24px (`md:px-6`) | 24px, content max 1024px (`max-w-5xl`) |

Rules: no horizontal page scrolling at 360px; tap targets at least 44px tall (`min-h-11`); text inputs at 16px so phones don't zoom on focus (the design-system fields already do this).

## Rendering model

Cache Components is on (`cacheComponents: true`), so every uncached data read must sit inside `<Suspense>` or be cached with `"use cache"`. Otherwise Next.js reports a "blocking route" error. The home page streams: the heading is in the static shell, and the product grid streams in behind a skeleton that matches its layout.

## Roadmap

Each item has a spec in `specs/` that is reviewed before work starts.

1. ~~Auth and roles, seller panel, admin seller management~~ (done, [spec 001](specs/001-auth-and-roles.md))
2. Product images: Vercel Blob, browser-side resize, up to 5 photos per product ([spec 002](specs/002-product-images.md), draft)
3. Cart, guest checkout and orders: one order per seller, delivery fees per province set by each seller, cash on delivery or bank transfer, WhatsApp coordination; card payments and taxes are future work ([spec 003](specs/003-cart-and-orders.md), reviewed)
4. Deploy: free tiers while building (Vercel Hobby + Neon Free + Vercel Blob), Vercel Pro from public launch, `.com.do` domain, versioned migrations, CI ([spec 004](specs/004-deploy.md), reviewed)

Suggested order: spec 004 phase 1 (accounts, Vercel project, Blob stores) → 002 → 003 → 004 phases 2–4.
