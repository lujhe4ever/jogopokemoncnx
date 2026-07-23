#!/usr/bin/env bash
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL is required}"
backup_dir="${BACKUP_DIR:-ops/backups}"
retention_days="${BACKUP_RETENTION_DAYS:-7}"
mkdir -p "$backup_dir"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup_file="$backup_dir/projeto_lt-$timestamp.dump"

pg_dump "$DATABASE_URL" --format=custom --no-owner --file="$backup_file"
sha256sum "$backup_file" > "$backup_file.sha256"
find "$backup_dir" -type f -name 'projeto_lt-*.dump*' -mtime "+$retention_days" -delete
printf '%s\n' "$backup_file"
