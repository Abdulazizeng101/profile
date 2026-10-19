# Backup and restore

Your portfolio lives in two places:

| What                                           | Where                                           | Backed up by                                                               |
| ---------------------------------------------- | ----------------------------------------------- | -------------------------------------------------------------------------- |
| Text, settings, links, messages, file metadata | PostgreSQL                                      | `pnpm content:export`, `./scripts/backup.sh`, the dashboard export         |
| Photos, screenshots, diagrams, CVs             | `./storage` (local driver) or your S3/R2 bucket | `pnpm content:export`, `./scripts/backup.sh` (local driver only), `rclone` |

Backups contain personal data (contact messages, your phone number if you
entered one). Keep them somewhere private, and never commit them: `backups/`
is already in `.gitignore`.

## Recommended routine

- **Before any risky change** (a schema migration, a big content rewrite):
  `pnpm content:export`.
- **Monthly:** `pnpm content:export` and copy the folder to private cloud
  storage or an external drive.
- Your database host may keep short-term history (point-in-time restore).
  How long depends on the provider and plan; check the provider's current
  documentation rather than relying on it as your only backup.

All commands run from the project folder on your computer. To back up
production, put the production `DATABASE_URL` and storage settings in
`.env.local` (or pass them on the command line) for the duration of the
backup, then put your development values back.

## 1. Complete portable backup (recommended)

```bash
pnpm content:export                     # -> backups/content-<timestamp>/
pnpm content:export --out ~/portfolio-backup-2026-01
pnpm content:export --no-media          # text only
```

The folder contains:

```
content.json        every content table (no passwords, sessions or rate limits)
media/images/...    every image rendition, under its storage key
media/documents/... every PDF
```

It works the same with local storage and with Cloudflare R2 / S3, so it is also
the way to **move between storage providers**: export with the old settings,
import with the new ones.

### Restore it

```bash
pnpm db:migrate                         # only needed on a brand-new database
pnpm content:import backups/content-2026-01-31T10-00-00
```

The import:

1. validates the backup and prints a table of what it contains next to what
   the database holds now;
2. asks you to type `REPLACE` (pass `--yes` to skip this in scripts);
3. uploads the files to the configured storage (same keys, so re-running is safe);
4. replaces every content table **in one transaction**: if anything fails,
   the database is left exactly as it was.

Admin accounts and sessions are not touched. If no admin exists yet (a new
database), run `pnpm admin:create` afterwards.

Finally, sign in to the dashboard and use **Backup & export › Refresh public
site** (or restart the app) so the cached public pages show the restored
content.

## 2. Dashboard export (quick, text only)

**Dashboard › Backup & export › Download content export** downloads the same
`content.json` without the files. `pnpm content:import <file>.json` restores
it; the referenced files must still exist in your storage.

## 3. Full database snapshot (pg_dump)

```bash
./scripts/backup.sh
# -> backups/db-<timestamp>.dump
# -> backups/storage-<timestamp>.tar.gz   (local storage driver only)
```

This is a complete PostgreSQL dump, including admin accounts. Requirements:

- PostgreSQL client tools (`pg_dump`, `pg_restore`) with a major version equal
  to or newer than the server's. Check with `pg_dump --version`.
- For Neon, use the **direct** connection string (host without `-pooler`):
  `DATABASE_URL="postgres://...direct-host.../neondb?sslmode=require" ./scripts/backup.sh`

Restore (replaces everything in the target database, asks you to type `RESTORE`):

```bash
./scripts/restore.sh backups/db-2026-01-31T10-00-00Z.dump
tar -xzf backups/storage-2026-01-31T10-00-00Z.tar.gz     # local storage only
```

## 4. Bucket copy with rclone (optional)

For a plain copy of an R2 bucket, configure an rclone remote with an R2 API
token (read-only is enough) and run:

```bash
rclone sync r2:your-bucket ./backups/r2-mirror
```

## Recovery checklist

| Situation                        | What to do                                                                                                                       |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Deleted or broke some content    | `pnpm content:import <latest backup>` (replaces all content with that backup)                                                    |
| A migration failed during deploy | Migrations run in a transaction; the old schema is intact. Fix the migration, deploy again.                                      |
| Database lost or corrupted       | Create a new database, `pnpm db:migrate`, `pnpm content:import <backup>`, `pnpm admin:create`. Or `./scripts/restore.sh <dump>`. |
| Files missing from storage       | `pnpm content:import <backup folder>` re-uploads every file.                                                                     |
| Forgot the admin password        | `pnpm admin:reset-password` (needs `DATABASE_URL` access).                                                                       |
| Moving to another host           | Export with old settings, change `.env.local`, import.                                                                           |

## Test your backups

A backup you have never restored is a hope, not a backup. Every few months:

```bash
createdb portfolio_restore_check     # or: docker compose exec db createdb -U portfolio portfolio_restore_check
DATABASE_URL=postgres://portfolio:portfolio@localhost:5432/portfolio_restore_check pnpm db:migrate
DATABASE_URL=postgres://portfolio:portfolio@localhost:5432/portfolio_restore_check \
  LOCAL_STORAGE_DIR=./restore-check-storage pnpm content:import <backup folder> --yes
```

Then delete the check database and folder.
