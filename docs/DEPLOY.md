# Deploying Agrostore

This guide takes the app from your Mac to a running deployment on Vercel, with GitHub Actions deploying on every push. It follows [spec 004](../specs/004-deploy.md), stage B ("private beta"): **everything on free plans**, and the site is only visible to you.

**Time:** about 1 hour the first time.
**Cost:** $0 (Vercel Hobby, Neon Free, GitHub Free).

## How it fits together

```
           pull request                               push / merge to main
                │                                              │
     GitHub Actions: checks (typecheck, lint, tests, migrations up to date)
                │                                              │
  migrate Neon "preview" branch                    migrate Neon "main" branch
                │                                              │
     vercel deploy (preview)                         vercel deploy --prod
                │                                              │
   preview URL commented on the PR             https://<project>.vercel.app
```

- **Vercel** builds and hosts the app (region `iad1`, Washington D.C., the closest to the DR). Its own automatic Git deploys are switched off in `vercel.json`, so only the workflow deploys.
- **Neon** hosts Postgres (AWS `us-east-1`, next to `iad1`). The `main` branch is production. A `preview` branch is shared by all pull-request previews.
- **GitHub Actions** (`.github/workflows/ci-cd.yml`) runs the checks, applies database migrations, then asks Vercel to deploy.

Values you'll collect along the way (keep them in a password manager, never in the repo):

| Name | Where it comes from | Used by |
|---|---|---|
| Production pooled URL | Neon, branch `main`, pooling **on** | Vercel env `DATABASE_URL` (Production) |
| Production direct URL | Neon, branch `main`, pooling **off** | GitHub secret `PRODUCTION_DATABASE_URL_UNPOOLED`, creating the admin |
| Preview pooled URL | Neon, branch `preview`, pooling on | Vercel env `DATABASE_URL` (Preview) |
| Preview direct URL | Neon, branch `preview`, pooling off | GitHub secret `PREVIEW_DATABASE_URL_UNPOOLED` |
| Two auth secrets | `openssl rand -base64 32`, run twice | Vercel env `BETTER_AUTH_SECRET` (one for Production, one for Preview) |
| Vercel token, org ID, project ID | Vercel | GitHub secrets |

---

## Step 1: Prepare the project on your Mac

1. **Install the production database driver.** It replaces `postgres` with `pg`, the driver Vercel's connection-pool helper supports:

   ```bash
   cd ~/agrostore
   npm uninstall postgres
   npm install pg @vercel/functions
   npm install -D @types/pg
   ```

2. **Use Node 22**, the version CI and Vercel use (`.nvmrc`):

   ```bash
   nvm install 22 && nvm use 22   # if you use nvm
   node -v                        # should print v22.x
   ```

3. **Switch your local database to migrations.** The project now has a versioned migration in `drizzle/` instead of `drizzle-kit push`. Your local database was created with `push`, so reset it once:

   ```bash
   docker compose down -v && docker compose up -d
   sleep 3
   npm run db:migrate
   npm run seed
   ADMIN_EMAIL=you@example.com ADMIN_NAME="Your Name" ADMIN_PASSWORD='choose-a-password' npm run create-admin
   ```

4. **Run the same checks CI will run:**

   ```bash
   npm run typecheck
   npm run lint
   npm test
   npm run db:check
   ```

   All four must pass. Then run `npm run dev`, sign in at http://localhost:3000/auth/login, and check the store and the panels still work.

---

## Step 2: Create the Neon database (free)

1. Go to <https://neon.com> and sign up. "Continue with GitHub" is easiest.
2. **Create a project:**
   - Name: `agrostore`
   - Postgres version: **17** (same as your Docker database)
   - Cloud provider and region: **AWS, US East 1 (N. Virginia)**
3. Open **Connect** on the project dashboard. With branch **main** selected:
   - turn **Connection pooling ON** → copy the string → this is the **Production pooled URL** (its host contains `-pooler`);
   - turn **Connection pooling OFF** → copy → this is the **Production direct URL**.
4. Go to **Branches → New branch**: name `preview`, parent `main`, include data up to now → **Create**.
5. Open **Connect** again, select branch **preview**, and copy its pooled and direct URLs the same way.

The free plan gives 1 GB of storage and 100 compute-hours a month, plenty for the beta. The database sleeps after 5 minutes without traffic, so the first request after a pause takes about a second longer.

---

## Step 3: Create the Vercel project (free Hobby plan)

1. Go to <https://vercel.com/signup> and sign up with GitHub, choosing the **Hobby** plan.
2. **Link the project from your Mac:**

   ```bash
   cd ~/agrostore
   npx vercel@61.1.0 login
   npx vercel@61.1.0 link
   ```

   Answers:
   - "Set up and link?": **yes**
   - scope: your personal account
   - "Link to an existing project?": **no**
   - project name: `agrostore`
   - directory: `./`
   - if asked to connect the Git repository: either answer is fine, since `vercel.json` turns Vercel's own Git deploys off.

   This creates `.vercel/project.json`, which is gitignored.

3. **Copy the IDs** for GitHub:

   ```bash
   cat .vercel/project.json
   # {"projectId":"prj_…","orgId":"team_…" or "user_…", ...}
   ```

4. **Find your production URL:** Vercel dashboard → project **agrostore** → **Settings → Domains**. You'll see something like `agrostore-xyz.vercel.app`. That's your production address until the `.com.do` domain is connected.

5. **Protect every deployment** (private beta): **Settings → Deployment Protection** → method **Vercel Authentication**, scope **All Deployments** → Save. Visitors now have to sign in with your Vercel account. This is free on Hobby.

6. **Environment variables:** **Settings → Environment Variables**. Add each row, ticking only the environment shown:

   | Key | Value | Environment |
   |---|---|---|
   | `DATABASE_URL` | Production pooled URL | Production |
   | `DATABASE_URL` | Preview pooled URL | Preview |
   | `BETTER_AUTH_SECRET` | output of `openssl rand -base64 32` | Production |
   | `BETTER_AUTH_SECRET` | a **different** output of `openssl rand -base64 32` | Preview |
   | `BETTER_AUTH_URL` | `https://agrostore-xyz.vercel.app` (your URL from item 4, no trailing slash) | Production |
   | `CRON_SECRET` | output of `openssl rand -base64 32` | Production |

   Don't set `BETTER_AUTH_URL` for Preview: each preview uses its own Vercel URL automatically (`src/lib/auth-options.ts`).

   `BLOB_READ_WRITE_TOKEN` is added for you when a Blob store is connected to the project (**Storage** tab); check it's enabled for each environment that should upload photos. `CRON_SECRET` protects the daily photo cleanup (`vercel.json` → `/api/cron/cleanup-images`); Vercel sends it automatically, and without it the job refuses to run.

7. **Create a deploy token:** avatar → **Account Settings → Tokens → Create**:
   - name `github-actions-agrostore`
   - scope: your account
   - expiration: 1 year (or your preference; you'll need to replace it when it expires)

   Copy it now, because it's shown only once.

---

## Step 4: Add the GitHub secrets

Open <https://github.com/Franly96/agrostore> → **Settings → Secrets and variables → Actions → New repository secret**, and add:

| Secret | Value |
|---|---|
| `VERCEL_TOKEN` | the token from step 3.7 |
| `VERCEL_ORG_ID` | `orgId` from `.vercel/project.json` |
| `VERCEL_PROJECT_ID` | `projectId` from `.vercel/project.json` |
| `PRODUCTION_DATABASE_URL_UNPOOLED` | Production direct URL |
| `PREVIEW_DATABASE_URL_UNPOOLED` | Preview direct URL |

Or from the terminal with the GitHub CLI (`brew install gh`, then `gh auth login`); each command prompts for the value:

```bash
gh secret set VERCEL_TOKEN
gh secret set VERCEL_ORG_ID
gh secret set VERCEL_PROJECT_ID
gh secret set PRODUCTION_DATABASE_URL_UNPOOLED
gh secret set PREVIEW_DATABASE_URL_UNPOOLED
```

---

## Step 5: Commit and push: the first production deploy

```bash
git add -A
git status            # check: no .env, no .vercel/ in the list
git commit -m "Deploy setup: pg driver, migrations, Vercel config, CI/CD workflow"
git push origin main
```

Open the repo's **Actions** tab and watch the **CI/CD** run:

1. **Lint, typecheck, test**: about 2 minutes.
2. **Production deployment**: applies `drizzle/0000_baseline.sql` to the Neon `main` branch, then Vercel builds and deploys (about 2–3 minutes). The run summary shows the deployment URL.

If a step fails, see [Troubleshooting](#troubleshooting).

---

## Step 6: Create the production admin

The production database starts empty. Create your admin from your Mac using the **Production direct URL**. The quotes matter, because the URL contains `&` and `?`:

```bash
DATABASE_URL='<Production direct URL>' \
ADMIN_EMAIL=you@example.com ADMIN_NAME="Your Name" ADMIN_PASSWORD='a-strong-password' \
npm run create-admin
```

Values given on the command line take priority over your `.env`, so this writes to Neon, not Docker. Don't run `npm run seed` against production: it creates the sample seller and products.

**Optional, for previews:** run the same command with the **Preview direct URL**, and `DATABASE_URL='<Preview direct URL>' npm run seed` for sample data.

---

## Step 7: Check production

1. Open `https://agrostore-xyz.vercel.app` and sign in to Vercel when asked (deployment protection).
2. Sign in to the app at `/auth/login` with the admin from step 6.
3. Create a test seller in **Vendedores → Nuevo vendedor**. Sign out, sign in as the seller, publish a product, and check it on the home page.
4. Check on your phone and in a narrow browser window (375px), plus tablet and desktop widths.

The app is now deployed.

---

## Day-to-day workflow

```bash
git switch -c feature/my-change
# …code…
npm run typecheck && npm run lint && npm test
git push -u origin feature/my-change
```

1. Open a **pull request** on GitHub. The workflow runs the checks, migrates the `preview` database, deploys a preview, and comments its URL on the PR (updated on every push).
2. Review the preview, then **merge**. The workflow runs the checks again, migrates production and deploys to production.

Don't push straight to `main` for real changes. Use pull requests so the preview catches problems first.

### When you change the database schema

1. Edit `src/db/schema.ts`.
2. Run `npm run db:generate` to create a new SQL file in `drizzle/`. Read it.
3. Run `npm run db:migrate` to apply it to your local database.
4. Commit the schema **and** the `drizzle/` files together. CI fails if the schema changed without a migration.

Migrations run **before** the new code goes live, so for a minute the old code runs against the new schema. Keep every migration compatible with the previous release:
- add columns as nullable or with a default;
- rename or drop a column in two releases: first stop using it, then remove it.

Never edit a migration that has already run in production; add a new one instead.

### The shared preview database

All PRs share the Neon `preview` branch. If two PRs change the schema differently, or the preview data gets messy, reset it in Neon: **Branches → preview → Reset from parent**. That makes it a fresh copy of production. The next PR run re-applies its migrations.

---

## Rollback

- **Code:** Vercel dashboard → **Deployments** → pick the previous production deployment → **Instant Rollback**. Or run `npx vercel@61.1.0 rollback`. Then revert the commit on GitHub so `main` matches.
- **Database:** migrations are forward-only. Because of the compatibility rule above, the previous code keeps working after a rollback. For data mistakes, Neon can restore a branch to an earlier point in time; check the restore window your Neon plan includes.

---

## Troubleshooting

| Symptom | Likely cause and fix |
|---|---|
| **Typecheck** fails in CI but not locally | Run `npm run typecheck` (it regenerates the route types) locally and fix what it reports. |
| "**schema changed without a migration**" | Run `npm run db:generate`, commit the new `drizzle/` files. |
| **Migrate** step fails: connection refused or timeout | The `*_DATABASE_URL_UNPOOLED` secret is wrong. Use the **direct** URL (pooling off, no `-pooler` in the host), including `?sslmode=require`. |
| Migrate step: "relation already exists" | That database was created with `drizzle-kit push`. Reset the Neon branch (preview: "Reset from parent"; production at this early stage: delete and recreate the `main` data), then re-run the job. |
| **Deploy** step: "Project not found" / 403 | Check `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` and that `VERCEL_TOKEN` hasn't expired. |
| Vercel build fails mentioning `BETTER_AUTH_SECRET` or a database error | An environment variable is missing for that environment (step 3.6). After fixing it, re-run the job: **Actions → the run → Re-run jobs**. |
| The site shows a Vercel login page | That's the deployment protection (step 3.5). Sign in with your Vercel account. |
| App sign-in fails on a preview with an "origin" error | The preview was opened through a different URL than Vercel reported. Use the URL from the PR comment. |
| First page load is slow | Neon's free compute was asleep (5 minutes idle). That's expected on the free plan. |
| PR from a fork has no preview | By design: secrets aren't available to forks. |

---

## Later: going public (spec 004, stage C)

1. **Upgrade the Vercel team to Pro.** Required before real buyers and sales, since Hobby is non-commercial.
2. **Register the `.com.do` domain** at NIC.DO, add it in **Settings → Domains**, and update `BETTER_AUTH_URL` (Production) to `https://<your-domain>.com.do`.
3. Change Deployment Protection to **Standard Protection** so the production domain is public and previews stay private.
4. Work through the launch checklist in spec 004 §8: real contact details in `src/lib/site-config.ts`, privacy policy and terms, favicon, and a restore test.
