# Portfolio CMS

A bilingual (English / Arabic) personal portfolio for a software engineer, with
a private dashboard for managing every piece of content: profile, photo, About,
projects, skills, experience, education, certifications, links, CV and site
settings. Saving in the dashboard updates the public site immediately, with no
code change and no redeploy.

- **Public site** at `/en` and `/ar`: home page, projects index with filters,
  a case-study page per project, contact form, sitemap, Open Graph and
  structured data. Dark theme by default, light theme on request; full RTL
  layout for Arabic.
- **Dashboard** at `/admin`: sign-in only (no public registration), drafts,
  publish / unpublish, preview of drafts on the real site, drag-to-reorder,
  image uploads with automatic resizing, PDF CVs, a contact inbox, and content
  export.
- **Honest by design:** nothing about you is invented. The seed data is
  empty or clearly marked as sample content that the server refuses to
  publish; missing Arabic text falls back to English (marked as English) or is
  hidden, never machine-translated; planned roles can't be presented as
  completed experience.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the design and security
model, and [docs/BACKUP.md](docs/BACKUP.md) for backup and recovery.

---

## Contents

1. [Tech stack](#tech-stack)
2. [Quick start](#quick-start)
3. [Prerequisites](#prerequisites)
4. [Environment variables](#environment-variables)
5. [Database and migrations](#database-and-migrations)
6. [The admin account](#the-admin-account)
7. [Commands](#commands)
8. [Testing](#testing)
9. [Using the dashboard](#using-the-dashboard)
10. [File storage](#file-storage)
11. [Deployment](#deployment)
12. [Costs](#costs)
13. [Backups](#backups)
14. [Troubleshooting](#troubleshooting)

---

## Tech stack

| Layer      | Choice                                                                                                            |
| ---------- | ----------------------------------------------------------------------------------------------------------------- |
| Framework  | Next.js 16 (App Router, Server Components, Server Actions, Cache Components), React 19, TypeScript                |
| Styling    | Tailwind CSS 4, a small set of accessible primitives on Radix UI, Lucide icons, Simple Icons for technology logos |
| Database   | PostgreSQL with **Drizzle ORM** (typed queries, plain-SQL migrations)                                             |
| Validation | Zod, on the server for every mutation                                                                             |
| Auth       | Own implementation: Argon2id password hashes, server-side sessions in Postgres, HTTP-only cookies                 |
| Files      | Storage abstraction: local disk (development / VPS) or any S3-compatible bucket (Cloudflare R2 recommended)       |
| Images     | sharp: re-encoded to WebP at 6 responsive widths, EXIF/GPS stripped                                               |
| Tests      | Vitest (unit + database integration), Playwright + axe-core (end-to-end and accessibility)                        |

**Why Drizzle and not Prisma?** The brief preferred Prisma. Prisma's CLI
downloads its engine binaries at install and migration time; the environment
this project was built in could not reach that download server, so Prisma
migrations could not be generated or tested. Drizzle is pure TypeScript, needs
no downloaded engine, and its migrations are plain SQL files you can read in
`drizzle/`. Queries are fully typed from the schema, so day-to-day use is very
similar.

---

## Quick start

```bash
# 1. Install dependencies
pnpm install

# 2. Start PostgreSQL (Docker) — or use your own Postgres, see below
docker compose up -d

# 3. Configure
cp .env.example .env.local
#    then set APP_SECRET:
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"

# 4. Create the tables and the starter content
pnpm db:migrate
pnpm db:seed

# 5. Create your admin account (prompts for email and password)
pnpm admin:create

# 6. Run
pnpm dev
```

Open <http://localhost:3000> for the site and <http://localhost:3000/admin>
for the dashboard. The site starts almost empty on purpose: the dashboard's
**Overview** page has a setup checklist that walks you through filling it in.

---

## Prerequisites

| Tool                    | Version                                   | Notes                                                                                   |
| ----------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------- |
| Node.js                 | 20.19 or newer (22 LTS recommended)       | `node --version`                                                                        |
| pnpm                    | 10                                        | `corepack enable` then `corepack prepare pnpm@10 --activate`, or `npm i -g pnpm`        |
| PostgreSQL              | 15 or newer                               | Via `docker compose` (needs Docker Desktop), a local install, or a free hosted database |
| PostgreSQL client tools | same major version as the server or newer | Only for `pnpm db:backup` / `db:restore` (`pg_dump`, `pg_restore`)                      |

**Without Docker:** install PostgreSQL, then create the user and databases
the defaults expect:

```sql
CREATE ROLE portfolio LOGIN PASSWORD 'portfolio';
CREATE DATABASE portfolio OWNER portfolio;
CREATE DATABASE portfolio_test OWNER portfolio;  -- for `pnpm test`
CREATE DATABASE portfolio_e2e OWNER portfolio;   -- for `pnpm test:e2e`
```

Or point `DATABASE_URL` at a free hosted database (for example a Neon
development branch).

---

## Environment variables

Copy `.env.example` to `.env.local` and fill it in. `.env.local` is ignored by
Git; **never commit real credentials**. On a host such as Vercel, set the same
variables in the project settings instead.

| Variable                                                                                             | Required                       | Purpose                                                                                                                                                                                      |
| ---------------------------------------------------------------------------------------------------- | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                                                                                       | yes                            | PostgreSQL connection string. On Neon, use the **pooled** string (host contains `-pooler`) with `?sslmode=require`.                                                                          |
| `SITE_URL`                                                                                           | yes in production              | Public URL without trailing slash, e.g. `https://yourname.dev`. Used for canonical URLs, sitemap, Open Graph and same-origin checks.                                                         |
| `APP_SECRET`                                                                                         | yes                            | 32+ random characters. Signs contact-form tokens and hashes IP addresses for rate limiting. Changing it only resets those; it does not sign you out.                                         |
| `STORAGE_DRIVER`                                                                                     | no (default `local`)           | `local` or `s3`. Must be `s3` on Vercel and other serverless hosts.                                                                                                                          |
| `LOCAL_STORAGE_DIR`                                                                                  | no (default `./storage`)       | Folder for uploads with the local driver. Outside `public/`; served by `/media/*`.                                                                                                           |
| `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_URL` | with `s3`                      | Bucket settings. `S3_PUBLIC_URL` is the public base URL of the bucket (custom domain or `r2.dev` URL). **Set it before building**: it is added to the Content-Security-Policy at build time. |
| `MAX_UPLOAD_MB`                                                                                      | no (default 4)                 | Upload size limit. Keep at 4 on Vercel (functions accept ~4.5 MB bodies). Photos are resized in the browser first, so this rarely matters.                                                   |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `CONTACT_NOTIFY_TO`                 | no                             | Email notification for each contact message. Messages are always saved to the dashboard inbox regardless.                                                                                    |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`                                             | no                             | Cloudflare Turnstile on the contact form. Optional: the form already has a honeypot, a signed timing check and rate limits. Build-time for the site key.                                     |
| `TRUSTED_IP_HEADER`                                                                                  | no (default `x-forwarded-for`) | Header that carries the visitor's IP. See [VPS deployment](#option-b-a-small-vps) before changing.                                                                                           |
| `DATABASE_POOL_MAX`                                                                                  | no (default 5)                 | Connections per server instance.                                                                                                                                                             |
| `TEST_DATABASE_URL`                                                                                  | tests only                     | Set in the committed `.env.test` to the local `portfolio_test` database.                                                                                                                     |

Nothing secret uses the `NEXT_PUBLIC_` prefix, so no secret can reach the browser.

---

## Database and migrations

The schema lives in `src/server/db/schema.ts`; migrations are SQL files in
`drizzle/`, committed to Git.

```bash
pnpm db:migrate      # apply pending migrations (safe to run repeatedly)
pnpm db:seed         # insert starter rows that don't exist yet (safe to re-run)
pnpm db:studio       # browse the database in Drizzle Studio
```

**Changing the schema** (only needed if you modify the code):

```bash
# 1. edit src/server/db/schema.ts
pnpm db:generate     # writes drizzle/NNNN_<name>.sql — read it before committing
pnpm db:migrate      # apply locally
# 2. commit the schema change and the new SQL file together
```

Migrations run inside a transaction, so a failing migration leaves the
database unchanged. On Vercel, `pnpm vercel-build` applies pending migrations
before every build. Prefer additive changes (new columns with defaults, new
tables); for anything destructive, take a backup first
(`pnpm content:export`).

**What the seed creates:** empty profile and site settings, the eight skill
categories from the brief (no skills), six project categories, your KFUPM
education entry as a **draft** with no dates or grades for you to confirm,
and one clearly labelled **sample project** that cannot be published until
you replace it.

---

## The admin account

There is no sign-up page. Create the account from the command line:

```bash
pnpm admin:create
# or non-interactively (CI, hosted consoles):
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='a-long-passphrase' pnpm admin:create
```

Passwords need at least 12 characters. A second account can only be created
with `--allow-additional`.

**Forgot the password?** `pnpm admin:reset-password` sets a new one and signs
that account out everywhere. It needs access to the database (`DATABASE_URL`),
which is what makes it safe. In the dashboard, **Account & security** lets you
change your password and sign out other devices.

For production, run `pnpm admin:create` once from your computer with the
production `DATABASE_URL`:

```bash
DATABASE_URL="postgres://...neon.tech/neondb?sslmode=require" pnpm admin:create
```

---

## Commands

| Command                                                     | What it does                                         |
| ----------------------------------------------------------- | ---------------------------------------------------- |
| `pnpm dev`                                                  | Development server at <http://localhost:3000>        |
| `pnpm build` / `pnpm start`                                 | Production build / run it                            |
| `pnpm check`                                                | Type check, lint and all Vitest tests                |
| `pnpm typecheck`                                            | TypeScript, including generated route types          |
| `pnpm lint` / `pnpm format`                                 | ESLint / Prettier                                    |
| `pnpm test`                                                 | Unit + database integration tests (Vitest)           |
| `pnpm test:unit`                                            | Unit tests only (no database needed)                 |
| `pnpm test:e2e`                                             | End-to-end tests in Chromium (Playwright)            |
| `pnpm db:migrate` / `db:seed` / `db:generate` / `db:studio` | Database, see above                                  |
| `pnpm admin:create` / `admin:reset-password`                | Admin account, see above                             |
| `pnpm content:export` / `content:import <path>`             | Portable backup and restore of all content and files |
| `pnpm db:backup` / `db:restore <file>`                      | Full `pg_dump` snapshot and restore (bash)           |

---

## Testing

```bash
pnpm test           # Vitest: validation rules, localisation fallback, upload
                    # checks, passwords, storage, backup coverage, and the
                    # Postgres rate limiter (uses portfolio_test)
pnpm test:e2e       # Playwright: the full dashboard → public site workflow,
                    # both languages, accessibility (axe, WCAG 2.1 AA),
                    # security headers, upload checks, login lockout
```

- The database tests read `TEST_DATABASE_URL` from `.env.test` (the
  `portfolio_test` database that `docker compose` creates). They refuse to run
  against a database whose name doesn't contain "test". Without a database,
  run `pnpm test:unit`.
- The end-to-end suite **wipes** `portfolio_e2e` and `./storage-e2e` on every
  run, then migrates, seeds and creates a test admin. Override the database
  with `E2E_DATABASE_URL` (its name must contain "test" or "e2e").
- First run only: `pnpm exec playwright install chromium`.
- `E2E_PROD=1 pnpm test:e2e` runs the suite against a production build.

---

## Using the dashboard

A typical first session, following the Overview checklist:

1. **Profile** — name, title, introduction, location, availability, languages,
   email and phone, each with its own "publish" switch. English is required;
   Arabic is optional (switch tabs at the top of each form).
2. **Photo & media** — upload your photo (JPG, PNG or WebP). You see a preview
   before saving; add alt text. The media library shows where each file is used.
3. **About me** — Markdown editor with a preview tab.
4. **Projects** — replace or delete the sample, then add your own. _Save
   draft_ keeps a project private; _Save and publish_ makes it public. Upload
   screenshots and architecture diagrams on the project's page; the first
   screenshot is the cover unless you choose another. Drag to reorder;
   duplicate to start from an existing project.
5. **Skills, Experience, Education, Certifications & awards** — same
   pattern. Experience has a status (planned / current / completed) that must
   match its dates; planned roles appear under "Upcoming".
6. **CV & documents** — upload an English and, optionally, an Arabic PDF.
   The public "Download CV" button always points at `/cv`, which serves the
   current file.
7. **Links & contact**, **Appearance** (theme, accent colour, section order and
   visibility), **SEO** (titles, descriptions, sharing image, search-engine
   indexing), **Languages** (Arabic on/off, fallback behaviour).
8. **Preview drafts** (top bar) shows the public site including drafts, only
   to you. **View site** opens the public site as visitors see it.

Search engines are told **not** to index the site until you switch on
indexing under **SEO**, so a half-finished site never appears in search results.

Sections with no published entries are hidden automatically.

---

## File storage

Files are never stored in the database. The database keeps metadata (type,
size, dimensions, alt text, storage key); the bytes live in the configured
storage driver.

|           | `local`                                                                | `s3`                                                          |
| --------- | ---------------------------------------------------------------------- | ------------------------------------------------------------- |
| Where     | `LOCAL_STORAGE_DIR` on the server's disk                               | An S3-compatible bucket                                       |
| Served by | The app (`/media/...`, cached for a year; every upload has a new name) | The bucket's public URL, directly                             |
| Use for   | Development; a VPS with a persistent disk                              | Vercel and other serverless hosts (their disks are temporary) |
| Cost      | Your disk                                                              | See [Costs](#costs)                                           |

### Setting up Cloudflare R2

1. In the Cloudflare dashboard, open **R2** and create a bucket (e.g.
   `portfolio-media`). Cloudflare may ask for a payment method to enable R2
   even if you stay within the free allowance.
2. Make it readable: either connect a **custom domain** (e.g.
   `media.yourname.dev`, recommended) or enable the **r2.dev** public URL
   (fine for testing; Cloudflare rate-limits it and doesn't recommend it for
   production).
3. **Manage R2 API tokens → Create API token** with _Object Read & Write_,
   limited to this bucket. Copy the access key ID and secret.
4. Set:

   ```
   STORAGE_DRIVER=s3
   S3_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
   S3_REGION=auto
   S3_BUCKET=portfolio-media
   S3_ACCESS_KEY_ID=...
   S3_SECRET_ACCESS_KEY=...
   S3_PUBLIC_URL=https://media.yourname.dev
   ```

Any S3-compatible service works the same way (AWS S3, Backblaze B2, MinIO).
To move files between drivers, see [docs/BACKUP.md](docs/BACKUP.md)
("Complete portable backup").

---

## Deployment

### Option A: Vercel + Neon + Cloudflare R2 (recommended)

No servers to maintain; each service has a free allowance that comfortably
fits a personal portfolio (see [Costs](#costs)).

1. **Database (Neon).** Create a project in the region nearest your visitors
   or your Vercel region. Copy two connection strings: the **pooled** one
   (host contains `-pooler`) for the app, and the **direct** one for backups.
2. **Storage (R2).** Follow [Setting up Cloudflare R2](#setting-up-cloudflare-r2).
3. **Code.** Push this repository to GitHub (private is fine).
4. **Vercel.** _Add New → Project_, import the repository. Framework preset:
   Next.js. Set **Build Command** to `pnpm vercel-build` (applies migrations,
   then builds). Add the environment variables: `DATABASE_URL` (pooled),
   `SITE_URL`, `APP_SECRET` (a new random value, not your development one), the
   `S3_*` values with `STORAGE_DRIVER=s3`, `MAX_UPLOAD_MB=4`, and any
   optional SMTP / Turnstile values. Deploy.
5. **First-time data**, from your computer, with the production database:

   ```bash
   DATABASE_URL="<pooled neon url>" pnpm db:seed
   DATABASE_URL="<pooled neon url>" pnpm admin:create
   ```

6. **Domain.** Add your domain in Vercel → _Settings → Domains_, update
   `SITE_URL` to it and redeploy once.
7. Sign in at `https://yourdomain/admin`, fill in your content, and turn on
   indexing under **SEO** when you're ready.

From then on, content changes happen in the dashboard; deploy only when the
code changes (pushing to `main` deploys automatically).

> Vercel's Hobby plan is for personal, non-commercial use. A personal
> portfolio is the kind of project it is meant for; if you later use the site
> commercially (e.g. selling services), Vercel's terms require a paid plan.
> Read Vercel's fair-use guidelines yourself.

### Option B: a small VPS

Any Linux server with Node.js 22 and PostgreSQL (or a hosted database) works,
using local file storage on the server's disk.

```bash
git clone <your repo> portfolio && cd portfolio
pnpm install --frozen-lockfile
cp .env.example .env.local   # STORAGE_DRIVER=local, LOCAL_STORAGE_DIR=/var/lib/portfolio/storage,
                             # SITE_URL=https://yourname.dev, TRUSTED_IP_HEADER=x-real-ip
pnpm db:migrate && pnpm db:seed && pnpm admin:create
pnpm build
pnpm start --port 3000       # run under systemd or pm2 so it restarts on reboot
```

Put a reverse proxy with HTTPS in front, and make it **set** (not append to)
the client-IP header the app trusts, so visitors can't fake their IP to dodge
rate limits. With Caddy:

```
yourname.dev {
    reverse_proxy 127.0.0.1:3000 {
        header_up X-Real-IP {remote_host}
    }
}
```

Keep port 3000 closed to the internet (firewall), back up the storage folder
along with the database (`pnpm db:backup` archives it), and apply OS security
updates.

### Before going live

- [ ] `SITE_URL` is the real `https://` domain
- [ ] `APP_SECRET` is new and random (not the development value)
- [ ] Storage works: upload a photo, open the public site in a private window
- [ ] Contact form: send yourself a message; it appears in **Messages**
- [ ] The sample project is gone; your KFUPM entry has correct dates
- [ ] **SEO**: titles, description, sharing image; then enable indexing
- [ ] A first backup: `pnpm content:export` with production settings

---

## Costs

Prices and free allowances change; check each provider's pricing page before
relying on these figures (checked October 2026). **No external service is
guaranteed to stay free.**

| Service                                      | Free allowance (summary)                                                                                                                                                                                                          | When you'd pay                                                                                                        |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **Vercel** Hobby                             | Free for personal, non-commercial projects; includes e.g. 100 GB data transfer, 1M function invocations and 4 active-CPU hours a month. Exceeding a limit pauses that feature until the 30-day window resets; you are not billed. | Commercial use, or more than the allowance: Pro is $20 per developer seat per month plus usage.                       |
| **Neon** Free                                | 1 GB storage per project, 100 compute-unit hours per project per month, scale-to-zero after 5 minutes idle, 6 hours of point-in-time history.                                                                                     | More storage/compute or longer history: the Launch plan is usage-based (no monthly minimum).                          |
| **Cloudflare R2**                            | 10 GB-month storage, 1M Class A and 10M Class B operations a month; no egress (download) fees.                                                                                                                                    | Beyond that: $0.015 per GB-month storage plus per-operation fees. A portfolio's images are typically well under 1 GB. |
| **Domain name**                              | —                                                                                                                                                                                                                                 | Around $10–20 per year for a `.com` / `.dev`, depending on registrar; `.sa` domains go through Saudi registrars.      |
| **SMTP email** (optional)                    | Many transactional email providers have a small free tier; Gmail works with an app password.                                                                                                                                      | Only at volumes far above a portfolio's.                                                                              |
| **Cloudflare Turnstile** (optional)          | Free.                                                                                                                                                                                                                             | —                                                                                                                     |
| **VPS** (Option B instead of Vercel/Neon/R2) | —                                                                                                                                                                                                                                 | Typically a few dollars a month for the smallest plans, plus your time for maintenance.                               |

A cold start after Neon has scaled to zero adds a short delay to the first
dynamic request (the contact form, the dashboard). Public pages are cached,
so visitors rarely notice.

Sources: [Vercel Hobby plan](https://vercel.com/docs/plans/hobby),
[Neon plans](https://neon.com/docs/introduction/plans),
[Cloudflare R2 pricing](https://developers.cloudflare.com/r2/pricing).

---

## Backups

Short version (details and recovery checklist in
[docs/BACKUP.md](docs/BACKUP.md)):

```bash
pnpm content:export              # content + every uploaded file, any storage driver
pnpm content:import <folder>     # restore (asks you to type REPLACE; one transaction)
pnpm db:backup                   # full pg_dump snapshot (+ local storage archive)
pnpm db:restore <file.dump>      # restore a snapshot
```

The dashboard's **Backup & export** page also downloads a JSON export, and
has a **Refresh public site** button for after a restore.

---

## Troubleshooting

| Problem                                              | Fix                                                                                                                                                                             |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL is not set`                            | Create `.env.local` from `.env.example`. Scripts and the app read the same files.                                                                                               |
| `ECONNREFUSED 127.0.0.1:5432`                        | Postgres isn't running: `docker compose up -d` (or start your local server).                                                                                                    |
| `relation "..." does not exist`                      | Run `pnpm db:migrate`.                                                                                                                                                          |
| Can't sign in after several attempts                 | Login is rate-limited (5 failures per account / 20 attempts per IP per 15 minutes). Wait, or `pnpm admin:reset-password`.                                                       |
| Uploaded images don't show in production             | Check `STORAGE_DRIVER=s3`, the bucket's public access, and that `S3_PUBLIC_URL` was set **before** the build (it's in the Content-Security-Policy). Redeploy after changing it. |
| Upload fails on Vercel with a size error             | Keep `MAX_UPLOAD_MB=4`; compress large PDFs.                                                                                                                                    |
| Contact form says "The message couldn't be verified" | Its anti-spam checks rejected it: the form was sent less than 3 seconds after loading (what bots do), or the page was open so long its token expired. Reload and try again.     |
| Changes don't show after a restore                   | Dashboard → **Backup & export → Refresh public site**. Normal saves refresh automatically.                                                                                      |
| Arabic site shows English text                       | That item has no Arabic translation yet; add it, or choose "Hide the item" under **Languages**.                                                                                 |

---

## Project structure

```
src/app/[locale]/       public pages (en / ar)
src/app/admin/          dashboard (login + protected pages)
src/app/api/admin/      upload, export, preview endpoints
src/components/         public/, admin/, ui/, shared/
src/lib/                validation (Zod), i18n dictionaries, types, helpers
src/server/             db/, auth/, actions/, content/, media/, storage/, security/
drizzle/                SQL migrations
scripts/                migrate, seed, admin, backup / restore, export / import
tests/                  unit/, integration/, e2e/
docs/                   ARCHITECTURE.md, BACKUP.md
```

More in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
