#!/usr/bin/env bash
set -euo pipefail

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"
S3_BUCKET="${S3_BUCKET:-}"
S3_PREFIX="${S3_PREFIX:-oneuptime-backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
CLICKHOUSE_HOST="${CLICKHOUSE_HOST:-clickhouse}"
CLICKHOUSE_PORT="${CLICKHOUSE_PORT:-8123}"
CLICKHOUSE_USER="${CLICKHOUSE_USER:-default}"
CLICKHOUSE_PASSWORD="${CLICKHOUSE_PASSWORD:-}"
CLICKHOUSE_DATABASE="${CLICKHOUSE_DATABASE:-oneuptime}"
DATABASE_HOST="${DATABASE_HOST:-postgres}"
DATABASE_PORT="${DATABASE_PORT:-5432}"
DATABASE_USERNAME="${DATABASE_USERNAME:-postgres}"
DATABASE_NAME="${DATABASE_NAME:-oneuptimedb}"
PGPASSWORD="${DATABASE_PASSWORD:-}"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

error_exit() { log "ERRO: $*"; exit 1; }

do_postgres_backup() {
    local file="${BACKUP_DIR}/postgres-${DATE}.sql.gz"
    log "Backup Postgres: ${file}"
    PGPASSWORD="${PGPASSWORD}" pg_dump \
        -h "${DATABASE_HOST}" \
        -p "${DATABASE_PORT}" \
        -U "${DATABASE_USERNAME}" \
        -d "${DATABASE_NAME}" \
        --format=custom \
        --compress=9 \
        -f "${file}" 2>&1 || error_exit "Falha no backup Postgres"
    echo "${file}"
}

do_clickhouse_backup() {
    local file="clickhouse-${DATE}.zip"
    local path="${BACKUP_DIR}/${file}"
    log "Backup ClickHouse: ${path}"

    local auth=""
    if [ -n "${CLICKHOUSE_PASSWORD}" ]; then
        auth="-u ${CLICKHOUSE_USER}:${CLICKHOUSE_PASSWORD}"
    fi

    curl -s ${auth} \
        -X POST \
        "http://${CLICKHOUSE_HOST}:${CLICKHOUSE_PORT}/" \
        --data "BACKUP DATABASE ${CLICKHOUSE_DATABASE} TO File('/backups/${file}')" 2>&1 || error_exit "Falha no backup ClickHouse"
    echo "${path}"
}

do_s3_upload() {
    local file="$1"
    if [ -z "${S3_BUCKET}" ]; then
        log "S3_BUCKET nao configurado, pulando upload"
        return
    fi

    local filename
    filename=$(basename "${file}")
    local s3_key="${S3_PREFIX}/${filename}"

    log "Enviando para s3://${S3_BUCKET}/${s3_key}"
    aws s3 cp "${file}" "s3://${S3_BUCKET}/${s3_key}" 2>&1 || error_exit "Falha no upload S3"
}

cleanup_local() {
    log "Limpando backups locais com mais de ${RETENTION_DAYS} dias"
    find "${BACKUP_DIR}" -name 'postgres-*.sql.gz' -mtime "+${RETENTION_DAYS}" -delete 2>/dev/null || true
    find "${BACKUP_DIR}" -name 'clickhouse-*.zip' -mtime "+${RETENTION_DAYS}" -delete 2>/dev/null || true
}

cleanup_s3() {
    if [ -z "${S3_BUCKET}" ]; then
        return
    fi
    log "Limpando backups S3 com mais de ${RETENTION_DAYS} dias"

    local cutoff
    cutoff=$(date -d "-${RETENTION_DAYS} days" +%Y%m%d 2>/dev/null || date -v-${RETENTION_DAYS}d +%Y%m%d 2>/dev/null)

    aws s3 ls "s3://${S3_BUCKET}/${S3_PREFIX}/" 2>/dev/null | while read -r line; do
        local date_str
        date_str=$(echo "${line}" | awk '{print $1}' | tr -d '-')
        local key
        key=$(echo "${line}" | awk '{$1=""; $2=""; $3=""; print $0}' | sed 's/^ *//')

        if [ -n "${date_str}" ] && [ -n "${key}" ] && [ "${date_str}" -lt "${cutoff}" ] 2>/dev/null; then
            aws s3 rm "s3://${S3_BUCKET}/${S3_PREFIX}/${key}" 2>/dev/null || true
        fi
    done
}

main() {
    log "=== Iniciando backup ==="

    mkdir -p "${BACKUP_DIR}"

    local pg_file clickhouse_file

    pg_file=$(do_postgres_backup)
    clickhouse_file=$(do_clickhouse_backup)

    log "Upload para S3..."
    do_s3_upload "${pg_file}"
    do_s3_upload "${clickhouse_file}"

    cleanup_local
    cleanup_s3

    log "=== Backup concluido ==="
}

main "$@"
