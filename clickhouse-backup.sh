# Backup do ClickHouse via BACKUP DATABASE nativo
# Gera um arquivo .zip em ./Backups/ que pode ser restaurado com clickhouse-restore.sh
# Recomendado rodar 1x/dia via cron

export $(grep -v '^#' config.env | xargs)

BACKUP_DIR="./Backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="oneuptime-full-${DATE}.zip"

mkdir -p "${BACKUP_DIR}"

echo "Iniciando backup do ClickHouse..."

BACKUP_QUERY="BACKUP DATABASE ${CLICKHOUSE_DATABASE} TO File('${BACKUP_FILE}')"

docker compose exec clickhouse clickhouse-client \
  --query "${BACKUP_QUERY}" 2>&1

if [ $? -eq 0 ]; then
  echo ""
  echo "Backup concluído: ${BACKUP_DIR}/${BACKUP_FILE}"

  # Remove backups mais velhos que 30 dias
  find "${BACKUP_DIR}" -name 'oneuptime-full-*.zip' -mtime +30 -delete
  echo "Backups antigos (>30 dias) limpos."
else
  echo "ERRO: Backup falhou!"
  exit 1
fi
