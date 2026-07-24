#!/usr/bin/env bash
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL is required}"
temporary_dir="$(mktemp -d)"
temporary_database="projeto_lt_restore_${RANDOM}_${RANDOM}"
base_url="${DATABASE_URL%/*}"
restore_url="$base_url/$temporary_database"

cleanup() {
  dropdb --if-exists --maintenance-db="$DATABASE_URL" "$temporary_database" >/dev/null 2>&1 || true
  rm -rf "$temporary_dir"
}
trap cleanup EXIT

BACKUP_DIR="$temporary_dir" BACKUP_RETENTION_DAYS=0 \
  bash ops/scripts/backup.sh >/dev/null
backup_file="$(find "$temporary_dir" -type f -name '*.dump' -print -quit)"
createdb --maintenance-db="$DATABASE_URL" "$temporary_database"
RESTORE_DATABASE_URL="$restore_url" \
  BACKUP_FILE="$backup_file" \
  RESTORE_CONFIRMATION=RESTORE_DATABASE \
  bash ops/scripts/restore.sh >/dev/null

migrations="$(psql "$restore_url" --tuples-only --no-align --command='SELECT COUNT(*) FROM "_prisma_migrations";')"
if [[ ! "$migrations" =~ ^[1-9][0-9]*$ ]]; then
  echo "restored database has no migration history" >&2
  exit 1
fi
printf 'backup restore verified with %s migrations\n' "$migrations"
