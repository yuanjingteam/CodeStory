#!/bin/sh
set -eu

backup_root="${BACKUP_ROOT:-backups}"
timestamp="$(date +%Y%m%d_%H%M%S)"
db_dir="${backup_root}/db"
uploads_dir="${backup_root}/uploads"
db_file="${db_dir}/codestory_${timestamp}.dump"
uploads_file="${uploads_dir}/codestory_uploads_${timestamp}.tar.gz"
db_tmp="${db_file}.tmp"
uploads_tmp="${uploads_file}.tmp"

mkdir -p "$db_dir" "$uploads_dir"
trap 'rm -f "$db_tmp" "$uploads_tmp"' EXIT

docker compose exec -T postgres sh -lc \
  'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --no-owner --no-acl' \
  > "$db_tmp"

test -s "$db_tmp"
mv "$db_tmp" "$db_file"

docker compose exec -T backend pnpm run backup:oss

tar -czf "$uploads_tmp" backend/uploads
test -s "$uploads_tmp"
mv "$uploads_tmp" "$uploads_file"

sha256sum "$db_file" "$uploads_file" > "${backup_root}/checksums_${timestamp}.sha256"

printf 'Database backup: %s\n' "$db_file"
printf 'Uploads backup: %s\n' "$uploads_file"
printf 'Checksums: %s\n' "${backup_root}/checksums_${timestamp}.sha256"
