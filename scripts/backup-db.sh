#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: DATABASE_URL=... BACKUP_DIR=... ./scripts/backup-db.sh [--s3]

Environment:
  DATABASE_URL             PostgreSQL connection string (required)
  BACKUP_DIR               Local backup directory (default: ./backups)
  BACKUP_RETENTION_DAYS    Local retention window (default: 14)
  BACKUP_ALLOW_PRODUCTION  Must be 1 for production-named databases

For --s3:
  S3_BUCKET                Destination bucket (required)
  S3_ENDPOINT              Optional S3-compatible endpoint
  S3_BACKUP_PREFIX        Optional prefix (default: backups/eduos)
  AWS_REGION               Optional region (default: us-east-1)
EOF
}

if [[ "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

DATABASE_URL="${DATABASE_URL:-}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"

if [[ -z "$DATABASE_URL" ]]; then
  echo "ERROR: DATABASE_URL is required" >&2
  exit 1
fi

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "ERROR: pg_dump is required" >&2
  exit 1
fi

if ! [[ "$BACKUP_RETENTION_DAYS" =~ ^[0-9]+$ ]]; then
  echo "ERROR: BACKUP_RETENTION_DAYS must be a non-negative integer" >&2
  exit 1
fi

# PostgreSQL URLs commonly use these names for production databases. Refuse
# destructive/operational actions unless production access is explicit.
db_name="$(printf '%s' "$DATABASE_URL" | sed -E 's#^.*\/([^/?]+)(\?.*)?$#\1#')"
case "$db_name" in
  eduos|prod|production)
    if [[ "${BACKUP_ALLOW_PRODUCTION:-0}" != "1" ]]; then
      echo "ERROR: refusing backup of production-named database '$db_name' without BACKUP_ALLOW_PRODUCTION=1" >&2
      exit 1
    fi
    ;;
esac

mkdir -p "$BACKUP_DIR"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
output="$BACKUP_DIR/eduos-${db_name}-${stamp}.dump.gz"

echo "Creating PostgreSQL backup: $output"
pg_dump --format=custom --no-owner --no-acl "$DATABASE_URL" | gzip -9 > "$output"

if [[ ! -s "$output" ]]; then
  echo "ERROR: backup file is empty" >&2
  rm -f "$output"
  exit 1
fi

# Remove old local backups. This is intentionally local-only; off-site copies
# are handled by the optional --s3 path or the storage provider's lifecycle.
find "$BACKUP_DIR" -type f -name 'eduos-*.dump.gz' -mtime +"$BACKUP_RETENTION_DAYS" -delete

if [[ "${1:-}" == "--s3" ]]; then
  if ! command -v aws >/dev/null 2>&1; then
    echo "ERROR: AWS CLI is required for --s3" >&2
    exit 1
  fi
  S3_BUCKET="${S3_BUCKET:-}"
  if [[ -z "$S3_BUCKET" ]]; then
    echo "ERROR: S3_BUCKET is required for --s3" >&2
    exit 1
  fi
  S3_BACKUP_PREFIX="${S3_BACKUP_PREFIX:-backups/eduos}"
  AWS_REGION="${AWS_REGION:-us-east-1}"
  destination="s3://${S3_BUCKET%/}/${S3_BACKUP_PREFIX%/}/$(basename "$output")"
  aws_args=(s3 cp "$output" "$destination" --region "$AWS_REGION" --only-show-errors)
  if [[ -n "${S3_ENDPOINT:-}" ]]; then
    aws_args+=(--endpoint-url "$S3_ENDPOINT")
  fi
  echo "Uploading backup: $destination"
  aws "${aws_args[@]}"
fi

echo "Backup completed successfully: $output"
