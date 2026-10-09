#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# xSypher Automated PostgreSQL & Redis Backup Script
#
# Usage:
#   DATABASE_URL="postgresql://..." BACKUP_DIR="/var/backups/xsypher" ./scripts/backup-db.sh
#
# Recommended cron (daily at 03:15 UTC):
#   15 3 * * * cd /home/ubuntu/apps/xsypher && set -a && . ./.env.production && set +a && ./scripts/backup-db.sh >> /var/log/xsypher-backup.log 2>&1
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/xsypher}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "[backup] ERROR: DATABASE_URL is not set." >&2
  exit 1
fi

mkdir -p "${BACKUP_DIR}"

PG_FILE="${BACKUP_DIR}/xsypher-pg-${TIMESTAMP}.sql.gz"
echo "[backup] Starting PostgreSQL dump -> ${PG_FILE}"
pg_dump --no-owner --no-privileges "${DATABASE_URL}" | gzip -9 > "${PG_FILE}"

# Verify non-empty archive
if [ ! -s "${PG_FILE}" ]; then
  echo "[backup] ERROR: Generated backup file is empty: ${PG_FILE}" >&2
  exit 1
fi

echo "[backup] Pruning backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -name "xsypher-pg-*.sql.gz" -type f -mtime +"${RETENTION_DAYS}" -delete

echo "[backup] Completed successfully at $(date -u +%Y-%m-%dT%H:%M:%SZ)"
