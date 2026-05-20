# Restaura um backup do ClickHouse a partir de um arquivo .zip em ./Backups/
# Uso: bash clickhouse-restore.sh <arquivo.zip>

export $(grep -v '^#' config.env | xargs)

BACKUP_FILE="$1"

if [ -z "$BACKUP_FILE" ]; then
  echo "Uso: bash clickhouse-restore.sh <arquivo.zip>"
  echo ""
  echo "Backups disponíveis em ./Backups/:"
  ls -lh ./Backups/*.zip 2>/dev/null || echo "  (nenhum backup encontrado)"
  exit 1
fi

BACKUP_PATH="./Backups/${BACKUP_FILE}"

if [ ! -f "$BACKUP_PATH" ]; then
  echo "ERRO: Arquivo não encontrado: ${BACKUP_PATH}"
  echo ""
  echo "Backups disponíveis:"
  ls -lh ./Backups/*.zip 2>/dev/null || echo "  (nenhum backup encontrado)"
  exit 1
fi

echo "Restaurando backup: ${BACKUP_PATH}"
echo "ATENÇÃO: Isso vai substituir TODOS os dados atuais do ClickHouse!"
read -p "Tem certeza? (s/N): " CONFIRM
if [ "$CONFIRM" != "s" ] && [ "$CONFIRM" != "S" ]; then
  echo "Restauração cancelada."
  exit 0
fi

echo "Restaurando..."
docker compose exec clickhouse clickhouse-client \
  --query "RESTORE DATABASE ${CLICKHOUSE_DATABASE} FROM File('${BACKUP_FILE}')" 2>&1

if [ $? -eq 0 ]; then
  echo ""
  echo "Restauração concluída com sucesso!"
else
  echo "ERRO: Restauração falhou!"
  exit 1
fi
