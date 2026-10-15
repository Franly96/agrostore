# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

AGENTS.md (imported above) holds the project rules: Cache Components/Suspense, design-system tokens, responsive requirements, money format. `README.md` has the Routes table, data model and roadmap. This file only adds commands and cross-file architecture.

## Commands

```bash
npm run dev                  # dev server on :3000 (Turbopack)
npm run build && npm start   # production build / serve
npm run lint                 # ESLint (eslint-config-next, core-web-vitals + typescript)
npm run typecheck            # next typegen + tsc --noEmit

docker compose up -d         # local Postgres 17 (agro/agro/agrostore on :5432)
npm run db:generate          # schema change → new SQL migration in drizzle/ (commit it)
npm run db:migrate           # apply migrations (uses DATABASE_URL_UNPOOLED if set)
npx drizzle-kit studio       # browse the DB
npm run seed                 # idempotent sample data (seller finca@example.com)
npm run create-admin         # ADMIN_EMAIL / ADMIN_NAME / ADMIN_PASSWORD env vars
npm test                     # Vitest (schemas, redirects, action authorization)
```

Verification is lint + `tsc` + `npm test` + checking the page in a browser at 375/768/1280px (see AGENTS.md). `.env` (gitignored) holds `DATABASE_URL`, `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL`; see `README.md`.

**Deploy.** GitHub Actions (`.github/workflows/ci-cd.yml`) runs the checks, migrates Neon (`preview` branch for PRs, `main` for pushes to `main`) and then runs `vercel deploy`; Vercel builds with its own env vars. `vercel.json` disables Vercel's Git auto-deploys and pins `iad1`. The DB client is `pg` + `attachDatabasePool` (`src/db/index.ts`). Full runbook: `docs/DEPLOY.md`.

## Architecture

**Data flow.** There is no API layer. Server components query Drizzle directly through `db` from `src/db/index.ts`, which builds the postgres.js client from `DATABASE_URL` at import time. Anything run outside Next (`seed.ts`, `drizzle.config.ts`) must `import "dotenv/config"` first because only Next loads `.env` for you.

**Reference pattern for a data page.** `src/app/(tienda)/productos/[id]/page.tsx` is the template. The page itself is a synchronous shell, and an inner async component sits under `<Suspense>` with a matching skeleton. That component awaits `params`, rejects ids that aren't valid int4 (`notFound()`, otherwise Postgres throws on overflow and you get a 500 instead of a 404), then joins `products` to `users`. `components/ui/product-list.tsx` is the list equivalent: it reads `searchParams` (name, category, page) and pages through `src/lib/data/catalog.ts`. Despite its folder, that file is app code, not a shadcn component.

**Typed route props.** `PageProps<"/productos/[id]">` and `LayoutProps<"/">` are global types that Next generates into `.next/dev/types/routes.d.ts` (imported by the gitignored `next-env.d.ts`). They are not imported; they exist after `next dev` or `next typegen`.

**Import alias.** `@/*` is the project root, not `src/`. The DB is therefore `@/src/db`, and shared components are `@/components/...` (they live outside `src/`).

**Styling pipeline (three files).**
1. `src/app/globals.css` declares the tokens once in `@theme static` as `--color-*`, `--text-*` and `--radius-*`. That is what generates classes like `bg-green-600` and `text-heading`.
2. A `:root` block in the same file re-exports them under the design system's bare names (`--green-600`, `--space-2`), which `components/agrostore/agrostore.css` consumes via `.ag-*` classes in `@layer components`. `globals.css` imports that file.
3. A second `:root` block maps shadcn's variables (`--primary`, `--ring`, …) onto the same tokens, so shadcn components added later pick up the brand automatically.

To change a colour, edit the `--color-*` value in step 1. CSS is compiled by the `@tailwindcss/turbopack` loader rule in `next.config.ts`, so builds are Turbopack-only.

**Component layers.** `components/agrostore/` is the design system, imported through its barrel `index.ts`. Interactive pieces such as `ProductForm` are `"use client"`; server pages that mount them need a small client wrapper. `components/ui/` holds shadcn primitives (`components.json`, style `base-nova`). Top-level `components/` holds app chrome (header, footer).

**Layout composition.** One root layout (`src/app/layout.tsx`: Figtree + Geist Mono, title template). Route groups add their chrome: `(tienda)` gives header + footer and `auth/` a centred card. Most pages are static placeholders. `/productos` and `/productos/[id]` read the DB publicly; `/vendor/**` (seller) and `/admin/**` (admin) are behind auth and use `components/dashboard-shell.tsx`.

**Auth flow.** Better Auth (`src/lib/auth.ts`, config shared with scripts via `auth-options.ts`) owns the `users` table plus `sessions`/`accounts`/`verifications`/`rate_limits`, with serial integer ids so `products.seller_id` stays an int FK. `src/proxy.ts` redirects requests without a session cookie away from `/vendor` and `/admin` (optimistic only). The real gate is `requireRole()` in `src/lib/dal.ts`, called first in every protected page's inner Suspense component and in every server action. Login is the `signIn` server action (`src/lib/auth-actions.ts`), which throttles itself (`src/lib/throttle.ts`) because Better Auth's limiter only covers `/api/auth/*`. The header's `AccountLink` is the only session read on store pages, behind its own Suspense boundary.

**Forms.** Client wrapper with `useActionState` → server action → `requireRole` → Zod schema from `src/lib/validation/` → write → `redirect(…?ok=…)`. The same schema runs in the browser before submit. `ProductForm` (design system) takes `action`, `validate` and `serverErrors` props.
