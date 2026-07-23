#!/usr/bin/env bash
set -euo pipefail

: "${RESTORE_DATABASE_URL:?RESTORE_DATABASE_URL is required}"
: "${BACKUP_FILE:?BACKUP_FILE is required}"
if [[ "${RESTORE_CONFIRMATION:-}" != "RESTORE_DATABASE" ]]; then
  echo "RESTORE_CONFIRMATION=RESTORE_DATABASE is required" >&2
  exit 2
fi

sha256sum --check "$BACKUP_FILE.sha256"
pg_restore \
  --clean \
  --if-exists \
  --no-owner \
  --exit-on-error \
  --dbname="$RESTORE_DATABASE_URL" \
  "$BACKUP_FILE"
printf '%s\n' "restore completed"
