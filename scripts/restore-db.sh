#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: ./scripts/restore-db.sh --target POSTGRES_URL BACKUP_FILE

Environment:
  RESTORE_ALLOW_PRODUCTION  Must be 1 for production-named targets
EOF
}

if [[ "${1:-}" == "--help" || "$#" -ne 3 || "$1" != "--target" ]]; then
  usage
  exit 2
fi

target="$2"
backup="$3"

if [[ -z "$target" || ! -f "$backup" ]]; then
  echo "ERROR: target URL and existing backup file are required" >&2
  exit 1
fi

if ! command -v pg_restore >/dev/null 2>&1; then
  echo "ERROR: pg_restore is required" >&2
  exit 1
fi

if ! gzip -t "$backup" >/dev/null 2>&1; then
  echo "ERROR: backup is not a valid gzip stream: $backup" >&2
  exit 1
fi

db_name="$(printf '%s' "$target" | sed -E 's#^.*\/([^/?]+)(\?.*)?$#\1#')"
case "$db_name" in
  eduos|prod|production)
    if [[ "${RESTORE_ALLOW_PRODUCTION:-0}" != "1" ]]; then
      echo "ERROR: refusing restore into production-named database '$db_name' without RESTORE_ALLOW_PRODUCTION=1" >&2
      exit 1
    fi
    ;;
esac

echo "WARNING: this will overwrite data in database '$db_name'."
printf "Type the database name exactly to continue: "
read -r confirmation
if [[ "$confirmation" != "$db_name" ]]; then
  echo "ERROR: confirmation did not match; restore aborted" >&2
  exit 1
fi

echo "Restoring $backup into $db_name"
gzip -dc "$backup" | pg_restore \
  --dbname="$target" \
  --clean \
  --if-exists \
  --no-owner \
  --no-acl \
  --exit-on-error

echo "Restore completed successfully."
