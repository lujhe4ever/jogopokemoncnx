#!/usr/bin/env bash
set -euo pipefail

: "${PREVIOUS_IMAGE_TAG:?PREVIOUS_IMAGE_TAG is required}"
if [[ "${ROLLBACK_CONFIRMATION:-}" != "ROLLBACK_APPLICATION" ]]; then
  echo "ROLLBACK_CONFIRMATION=ROLLBACK_APPLICATION is required" >&2
  exit 2
fi

LT_IMAGE_TAG="$PREVIOUS_IMAGE_TAG" \
  docker compose -f docker-compose.production.yml up \
  -d --no-build server web admin proxy
printf 'application rollback selected image tag %s\n' "$PREVIOUS_IMAGE_TAG"
