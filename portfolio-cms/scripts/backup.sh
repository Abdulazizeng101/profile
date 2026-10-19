#!/usr/bin/env bash
# Full database backup with pg_dump (custom format, compressed).
#
#   ./scripts/backup.sh                         # uses DATABASE_URL from the environment or .env.local
#   DATABASE_URL="postgres://..." ./scripts/backup.sh
#
# Writes backups/db-<timestamp>.dump. With STORAGE_DRIVER=local it also archives
# the uploaded files to backups/storage-<timestamp>.tar.gz.
#
# For Neon, use the DIRECT connection string (host without "-pooler") and a
# pg_dump whose major version is >= the server's (check with: pg_dump --version).
set -euo pipefail
cd "$(dirname "$0")/.."

env_value() {
  node -e "require('@next/env').loadEnvConfig(process.cwd(), true, {info(){}, error(){}}); process.stdout.write(process.env['$1'] || '')"
}

DATABASE_URL="${DATABASE_URL:-$(env_value DATABASE_URL)}"
if [ -z "$DATABASE_URL" ]; then
  echo "DATABASE_URL is not set (environment or .env.local)." >&2
  exit 1
fi
command -v pg_dump >/dev/null || { echo "pg_dump not found. Install the PostgreSQL client tools." >&2; exit 1; }

STAMP="$(date -u +%Y-%m-%dT%H-%M-%SZ)"
mkdir -p backups
umask 077   # backups contain personal data: readable by you only

DB_FILE="backups/db-${STAMP}.dump"
pg_dump --format=custom --no-owner --no-privileges --file="$DB_FILE" "$DATABASE_URL"
echo "Database: $DB_FILE ($(du -h "$DB_FILE" | cut -f1))"

DRIVER="${STORAGE_DRIVER:-$(env_value STORAGE_DRIVER)}"
if [ "${DRIVER:-local}" = "local" ]; then
  DIR="${LOCAL_STORAGE_DIR:-$(env_value LOCAL_STORAGE_DIR)}"
  DIR="${DIR:-./storage}"
  if [ -d "$DIR" ]; then
    tar -czf "backups/storage-${STAMP}.tar.gz" -C "$(dirname "$DIR")" "$(basename "$DIR")"
    echo "Files:    backups/storage-${STAMP}.tar.gz"
  fi
else
  echo "Files:    stored in your S3/R2 bucket. Back them up with 'pnpm content:export' or 'rclone sync' (see docs/BACKUP.md)."
fi
