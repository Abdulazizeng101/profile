#!/usr/bin/env bash
# Restores a database backup made by scripts/backup.sh.
#
#   ./scripts/restore.sh backups/db-2026-01-31T10-00-00Z.dump
#
# This REPLACES the database at DATABASE_URL, including admin accounts and
# sessions, with the contents of the dump. You will be asked to confirm.
set -euo pipefail
cd "$(dirname "$0")/.."

FILE="${1:-}"
if [ -z "$FILE" ] || [ ! -f "$FILE" ]; then
  echo "Usage: ./scripts/restore.sh <backups/db-....dump>" >&2
  exit 1
fi

env_value() {
  node -e "require('@next/env').loadEnvConfig(process.cwd(), true, {info(){}, error(){}}); process.stdout.write(process.env['$1'] || '')"
}
DATABASE_URL="${DATABASE_URL:-$(env_value DATABASE_URL)}"
[ -n "$DATABASE_URL" ] || { echo "DATABASE_URL is not set (environment or .env.local)." >&2; exit 1; }
command -v pg_restore >/dev/null || { echo "pg_restore not found. Install the PostgreSQL client tools." >&2; exit 1; }

# Show the host and database name only, never the password.
TARGET="$(node -e "const u=new URL(process.argv[1]); console.log(u.host + u.pathname)" "$DATABASE_URL")"
echo "This will replace ALL data in: $TARGET"
echo "with the backup:               $FILE"
read -r -p "Type RESTORE to continue: " ANSWER
[ "$ANSWER" = "RESTORE" ] || { echo "Cancelled. Nothing was changed."; exit 0; }

pg_restore --clean --if-exists --no-owner --no-privileges --single-transaction --dbname="$DATABASE_URL" "$FILE"
echo "Database restored. Restart the app (or use Dashboard › Backup & export › Refresh public site)."
echo "Local file storage is restored separately: tar -xzf backups/storage-<timestamp>.tar.gz"
