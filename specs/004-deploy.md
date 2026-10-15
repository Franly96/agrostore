# Spec 004 — Deploy to production

| | |
|---|---|
| Status | **Reviewed 2026-10-14**: start on free tiers (§2a), domain `.com.do`; decisions in §11 |
| Date | 2026-10-14 |
| Scope | Hosting, production database, file storage, migrations, environments, CI, security, monitoring, backups and the launch checklist |
| Depends on | Specs 001–003 (what gets deployed). **Phase 1 of this spec should happen before spec 002**, which needs a Vercel Blob store. |

---

## 1. Goals

1. Agrostore runs at a public HTTPS domain, fast for buyers in the Dominican Republic.
2. Every pull request gets a **preview deployment** with its own database copy. Production deploys from `main` only.
3. Schema changes are versioned migrations, applied automatically and safely.
4. Secrets are per environment and never in the repository.
5. Errors, performance and costs are visible; the database can be restored after a mistake.
6. Start at **$0** while building and testing privately, and move to paid plans only when the store opens to the public. The commercial use must be covered by the hosting plan's terms from launch day.

### Non-goals

- Multi-region or high-availability setups.
- Self-hosting on a VPS or Docker in production (the alternatives in §2 explain why).
- A staging environment separate from previews. Previews cover that need for now.

---

## 2. Key decisions

| # | Decision | Why | Rejected alternatives |
|---|---|---|---|
| D1 | **Vercel: Hobby (free) while building, Pro from public launch** (§2a) | Made by the Next.js team, so Cache Components, `proxy.ts`, image optimization and previews work with no setup. **The Hobby plan is non-commercial only**: Vercel's fair-use guidelines say any site that processes payments or advertises products for sale needs Pro or Enterprise. Pro is $20/month per developer seat and includes $20 of usage credit. | Hobby for the **public** store (not allowed once it sells). Netlify/Render/Railway: workable, but Next.js 16 features land on Vercel first. Self-hosted VPS: we'd run the OS, TLS, CDN, scaling and backups ourselves. |
| D2 | **Functions in `iad1` (Washington, D.C.)** | Vercel's default, and the closest compute region to the DR. Vercel's 19 regions have nothing in the Caribbean, and Miami isn't a region. Static and cached content is served from Vercel's edge locations near the user regardless. | `gru1` (São Paulo): farther from Santo Domingo than the US east coast. |
| D3 | **Neon Postgres via the Vercel Marketplace, AWS `us-east-1`** | Same area as `iad1` (low query latency). Billing goes on the Vercel invoice. The integration sets `DATABASE_URL` (pooled) and `DATABASE_URL_UNPOOLED` (direct), and can create a **database branch per preview** (`preview/<git-branch>`), so previews never touch production data. Scales to zero when idle. | Supabase: also good, but we already chose Better Auth and Vercel Blob, so we'd only use its database. Vercel-hosted Postgres from another provider: no per-preview branching. |
| D4 | **Switch the DB driver from `postgres.js` to `pg` (node-postgres) `Pool` + `attachDatabasePool`** | Vercel Fluid compute reuses function instances. `attachDatabasePool` from `@vercel/functions` closes idle connections before an instance suspends, and Vercel lists `pg` as supported, not `postgres.js`. Drizzle and Better Auth both work with `pg`. Pool idle timeout ≈5s, min 1, as Vercel recommends; max ≈10 per instance. | Keeping `postgres.js` with a hand-tuned idle timeout: works, but leaks idle connections on suspended instances. Neon's HTTP driver: no interactive transactions, which spec 003 needs for stock reservation. |
| D5 | **Versioned migrations with drizzle-kit** (`drizzle-kit generate` → SQL in `drizzle/` committed → `drizzle-kit migrate` over `DATABASE_URL_UNPOOLED`), run in the Vercel build command before `next build` | Every environment applies the same reviewed SQL. Previews migrate their own Neon branch, so a bad migration shows up before production. Neon says to run schema changes over the direct connection, not the pooler. | `drizzle-kit push` (what we use locally today): no history, and it can drop data on renames. Migrating by hand: gets forgotten. |
| D6 | **Expand/contract rule for migrations** | The build migrates before the new code is live, so for a few minutes the **old** code runs against the **new** schema. Every migration must work with the previous release: add columns as nullable or with defaults; rename or drop only in a later release. | Breaking migrations with downtime. |
| D7 | **Vercel Blob: separate public stores for production and preview/dev** | Previews and local development can't overwrite or delete production photos (spec 002). | One store for everything. |
| D8 | **GitHub + Vercel Git integration, with GitHub Actions for checks** | Push → preview URL on the PR. Lint, type-check and tests run on every PR and are required before merge. | Deploying from a laptop with the CLI. |

## 2a. Starting on free tiers

| Stage | What runs where | Cost | Allowed? |
|---|---|---|---|
| **A. Build** (now) | Local Docker Postgres; dev Blob store on a Vercel Hobby account | $0 | Yes |
| **B. Private beta** (team and invited sellers only, no public buyers, no real sales) | Vercel **Hobby** with Deployment Protection on every deployment; Neon **Free**; Vercel Blob Hobby allowance | $0 | Gray area. Vercel defines commercial use broadly ("financial gain of anyone involved in any part of the production"). A private, not-yet-selling test is the most Hobby should be used for. |
| **C. Public launch** (real buyers, real orders) | Vercel **Pro** (free trial available, then $20/month per developer seat with $20 usage included); Neon stays Free until usage requires a paid plan | ≈$20/month + domain | Yes |

Moving from B to C is a plan upgrade in the Vercel dashboard. There are no code or infrastructure changes.

**Free-tier limits to watch in stage B** (from Vercel's and Neon's published limits):
- **Vercel Hobby**: 1M function invocations, 4 hours Active CPU, 100 GB data transfer and 5K image transformations per month. Blob: 1 GB storage and 2,000 uploads per month. If a Hobby limit is exceeded, that feature is blocked until 30 days pass. That's acceptable for a beta, and a reason not to launch publicly on Hobby.
- **Neon Free**: 1 GB storage per project and 100 compute-hours per month. Writes fail when storage is full, and compute suspends if the hours run out. The app's data is small (text rows; photos live in Blob), so 1 GB lasts a long time. Check it monthly.

**Free alternative if $0 is required after launch:** Netlify's free plan allows commercial use, with 300 credits per month. When credits run out, every site on the account pauses until the next cycle, which is risky for a store. Its support for Next.js 16.4 features (Cache Components, `proxy.ts`) must be verified first, and spec 002's storage would move to Netlify Blobs. Cloudflare Workers (OpenNext) isn't an option today: its adapter doesn't support the Node.js middleware runtime that `proxy.ts` uses.

---

## 3. Environments

| | Local | Preview (each PR) | Production |
|---|---|---|---|
| URL | `http://localhost:3000` | `agrostore-git-<branch>-<team>.vercel.app` (Vercel Authentication required) | `https://<name>.com.do` (§8) |
| Database | Docker Postgres | Neon branch `preview/<branch>` from production (copy-on-write) | Neon `main` branch |
| Blob store | dev store | dev store | production store |
| Migrations | `drizzle-kit push` or `migrate` | build command, automatic | build command, automatic |
| Data | `npm run seed` | copy of production at branch time (see Q4) | real |

**Preview protection:** previews are restricted to the Vercel team (Deployment Protection: Vercel Authentication), because a preview branch contains a copy of production data, including buyer contact details.

---

## 4. Configuration and secrets

| Variable | Local `.env` | Preview | Production | Notes |
|---|---|---|---|---|
| `DATABASE_URL` | Docker URL | set by the Neon integration (pooled, branch) | set by the Neon integration (pooled) | runtime queries |
| `DATABASE_URL_UNPOOLED` | same as above | integration | integration | migrations, scripts |
| `BETTER_AUTH_SECRET` | dev value | **its own** random value | **its own** random value | `openssl rand -base64 32`; never shared across environments |
| `BETTER_AUTH_URL` | `http://localhost:3000` | not set: derived from `VERCEL_BRANCH_URL` / `VERCEL_URL` | `https://<domain>` | `auth-options.ts` gets a `baseURL` fallback and `trustedOrigins` built from these |
| `BLOB_READ_WRITE_TOKEN` | dev store | dev store | production store | spec 002 |
| `CRON_SECRET` | — | — | random value | Vercel sends it to cron routes |

Code changes this needs:
- `src/db/index.ts`: `pg` `Pool` + `attachDatabasePool` + drizzle `node-postgres`.
- `drizzle.config.ts`: `DATABASE_URL_UNPOOLED ?? DATABASE_URL`.
- `auth-options.ts`: `baseURL` / `trustedOrigins` from `BETTER_AUTH_URL` or the Vercel system variables.
- `package.json`: `db:generate`, `db:migrate` scripts; Vercel build command `npm run db:migrate && next build`.

---

## 5. CI (GitHub Actions)

On every pull request and push to `main`:

1. `npm ci`
2. `npx next typegen` (route types for `tsc`)
3. `npm run lint`
4. `npx tsc --noEmit`
5. `npm test`
6. `npx drizzle-kit check` (migration files are consistent with the schema)

Branch protection on `main`: these checks must pass, plus one review if more than one person contributes.

---

## 6. Security

- [ ] HTTPS everywhere (Vercel's automatic certificates; HSTS).
- [ ] Response headers in `next.config.ts`: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (camera only on the photo upload page), `Content-Security-Policy: frame-ancestors 'none'`, plus a full CSP in a follow-up. Nonce-based CSP makes every page dynamic, which conflicts with Cache Components' static shells, so it needs its own spec using the Next.js CSP guide.
- [ ] Distinct `BETTER_AUTH_SECRET` per environment; rotation procedure documented (rotating signs everyone out).
- [ ] Production admin created with `npm run create-admin` against `DATABASE_URL_UNPOOLED` from a trusted machine. No seed data in production.
- [ ] Preview deployments protected (§3).
- [ ] Cron routes check `CRON_SECRET`.
- [ ] `npm audit` reviewed before launch; Dependabot (or Renovate) enabled on GitHub.
- [ ] Vercel Firewall: enable the managed bot protection and a rate-limit rule on `/ingresar` and `/pagar` as a second layer behind the app's own throttling.

---

## 7. Monitoring, backups and scheduled jobs

- **Logs and errors:** Vercel runtime logs (function errors, `console.error` from actions). An error-alerting service (e.g. Sentry's free tier) is optional (Q5).
- **Performance:** Vercel Speed Insights (real-user Core Web Vitals, which matter on mid-range phones) and Web Analytics (cookieless, so no consent banner needed).
- **Spend:** set Vercel Spend Management alerts (e.g. at $30 and $50 per month), and check Neon usage monthly.
- **Backups:** Neon point-in-time restore. **Confirm the restore window on the chosen Neon plan and require at least 7 days.** Plus a monthly `pg_dump` (over the unpooled URL) kept outside Neon. Test a restore once before launch.
- **Cron jobs** (`vercel.json`):
  - daily cleanup of orphan product photos (spec 002);
  - daily cleanup of expired Better Auth sessions/verifications and old `rate_limits` rows.

---

## 8. Launch checklist

- [ ] **`.com.do` domain** registered through NIC.DO (the `.do` registry). Check the name's availability, NIC.DO's registration requirements and the yearly fee before launch day, since a `.com.do` registration isn't instant. Point DNS to Vercel; `www` redirects to the apex domain.
- [ ] Real contact details in `src/lib/site-config.ts` (they are placeholders now).
- [ ] Favicon and app icons (the favicon was lost when `app/` moved to `src/app/`), Open Graph image, page descriptions.
- [ ] `robots.ts` and `sitemap.ts` (public store pages only; panels, orders and auth excluded).
- [ ] **Privacy policy and terms of use** pages, linked from the footer and `/pagar`. The DR has a personal data protection law (Ley 172-13), so have a lawyer review both. This spec doesn't give legal advice.
- [ ] Seller onboarding: admin creates the first real sellers; sellers sign in, change their password, publish products with photos.
- [ ] End-to-end test on production with a test seller and a test order (then cancel it), on a real phone.
- [ ] Restore test from backup done (§7).
- [ ] `README.md` gains a "Deploy" section (environments, migrations, rollback).

**Rollback:** Vercel "Instant Rollback" to the previous deployment for code. For the database, migrations follow expand/contract (D6), so the previous code keeps working against the new schema. For data mistakes, use Neon point-in-time restore to a new branch, then repoint.

---

## 9. Costs (estimate, October 2026 list prices)

| Item | Expected at launch |
|---|---|
| Vercel | **$0 on Hobby** while building and in private beta; **Pro from public launch**: $20/month per developer seat, includes $20 usage credit (functions, bandwidth, image optimization, Blob) |
| Neon (via Vercel) | usage-based; small at launch traffic, and it scales to zero when idle. The free plan (1 GB storage, 100 CU-hours/month per project) can work for the first weeks, but writes fail when storage is full. Plan to move to a paid plan before real sellers depend on it. |
| Vercel Blob | within the Pro credit at launch volumes (storage $0.023/GB-month in `iad1`) |
| Domain | yearly `.com.do` fee through NIC.DO |

Expected total: **$0 until public launch**, then **about $20–40/month** plus the domain. Check the actual usage after the first month.

---

## 10. Phases and acceptance criteria

**Phase 1 — Accounts and project (before spec 002), free**
- GitHub repository; Vercel account on **Hobby**; Vercel project linked; Blob stores (dev + production); `vercel env pull` for local Blob access.
- ✅ A push to a branch creates a protected preview URL (it may fail at runtime until phase 2; that's fine).

**Phase 2 — Database and driver**
- Neon via the Marketplace (`us-east-1`, preview branching on). Driver switch to `pg` + `attachDatabasePool`. Generate the baseline migration from the current schema; switch local development to migrations; build command with `db:migrate`.
- ✅ A PR preview runs against its own Neon branch with migrations applied. Production deploys from `main` with an empty, migrated database. `tsc`, lint and tests pass in CI.

**Phase 3 — Hardening**
- Security headers, Better Auth `baseURL`/`trustedOrigins` per environment, cron jobs, Speed Insights / Web Analytics, spend alerts, Firewall rules, backup + restore test.
- ✅ Signing in works on a preview URL and on production. The cron jobs run with the secret, and are refused without it.

**Phase 4 — Launch**
- **Upgrade Vercel to Pro**, connect the `.com.do` domain, work through the launch checklist (§8), onboard the first sellers.
- ✅ Every checklist item ticked; a real order placed and cancelled on production from a phone.

---

## 11. Review decisions (2026-10-14)

| # | Question | Decision |
|---|---|---|
| Q1 | Budget | **OK, but start on free tiers**: Hobby + Neon Free until public launch, Pro from launch day (§2a) |
| Q2 | Domain | **`.com.do`** through NIC.DO; exact name to be chosen (check availability) |
| — | Card payments, taxes | **Future work** (see spec 003) |

Still open, with the recommendation the spec follows for now:

| # | Question | Recommendation |
|---|---|---|
| Q3 | Who holds the Vercel, Neon and GitHub accounts? | A shared business account/email with at least two owners |
| Q4 | Previews use a copy of production data. OK if previews are team-only? | Yes, with Deployment Protection on |
| Q5 | Error alerting (e.g. Sentry free tier) | After launch, if Vercel logs aren't enough |
| Q6 | Order of work | 004 phase 1 → 002 images → 003 orders → 004 phases 2–4 → launch |

---

## References

- Vercel: [fair use guidelines (commercial use requires Pro)](https://vercel.com/docs/limits/fair-use-guidelines), [pricing](https://vercel.com/pricing), [regions](https://vercel.com/docs/regions), [`@vercel/functions` and `attachDatabasePool`](https://vercel.com/docs/functions/functions-api-reference/vercel-functions-package), [Blob pricing](https://vercel.com/docs/vercel-blob/usage-and-pricing)
- Free-tier comparison (Netlify allows commercial use on Free): [agentdeals.dev Vercel vs Netlify](https://agentdeals.dev/vercel-vs-netlify); OpenNext on Cloudflare limitations: [Cloudflare docs](https://developers.cloudflare.com/workers/framework-guides/web-apps/opennext/)
- Neon: [connection pooling](https://neon.com/docs/connect/connection-pooling), [Vercel-managed integration](https://neon.com/docs/guides/vercel-managed-integration), free plan summary at [agentdeals.dev](https://agentdeals.dev/vendor/neon)
- Next.js (bundled docs): `node_modules/next/dist/docs/01-app/02-guides/production-checklist.md`, `deploying-to-platforms.md`, `content-security-policy.md`
