#!/usr/bin/env bash
set -euo pipefail

CRON_SCHEDULE="${CRON_SCHEDULE:-0 3 * * *}"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

log "Container de Backup - OneUptime"
log "Agendamento: ${CRON_SCHEDULE}"
log "Bucket S3: ${S3_BUCKET:-nao configurado}"

mkdir -p /backups

echo "${CRON_SCHEDULE} /usr/local/bin/backup.sh >> /var/log/cron.log 2>&1" > /var/spool/cron/crontabs/root

crond -b -l 2

log "Cron iniciado. Rodando backup inicial..."
/usr/local/bin/backup.sh >> /var/log/cron.log 2>&1

log "Aguardando proximo agendamento..."
tail -f /var/log/cron.log
