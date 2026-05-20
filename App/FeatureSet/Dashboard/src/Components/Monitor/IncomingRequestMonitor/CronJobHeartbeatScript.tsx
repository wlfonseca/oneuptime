import ObjectID from "Common/Types/ObjectID";
import Card from "Common/UI/Components/Card/Card";
import CodeBlock from "Common/UI/Components/CodeBlock/CodeBlock";
import Button, { ButtonStyleType } from "Common/UI/Components/Button/Button";
import IconProp from "Common/Types/Icon/IconProp";
import { HOST, HTTP_PROTOCOL } from "Common/UI/Config";
import ProjectUtil from "Common/UI/Utils/Project";
import React, { FunctionComponent, ReactElement } from "react";

export interface ComponentProps {
  secretKey?: ObjectID;
}

const CronJobHeartbeatScript: FunctionComponent<ComponentProps> = (
  _props: ComponentProps,
): ReactElement => {
  const oneuptimeUrl: string = `${HTTP_PROTOCOL}${HOST.toString()}`;
  const projectId: string =
    ProjectUtil.getCurrentProjectId()?.toString() || "YOUR_PROJECT_ID";

  const curlCommand: string = `curl -fsSL ${oneuptimeUrl}/scripts/cron-setup.sh | \\
  ONEUPTIME_URL="${oneuptimeUrl}" \\
  PROJECT_ID="${projectId}" \\
  API_KEY="sua-api-key-aqui" \\
  bash`;

  const getScript: () => string = (): string => {
    return `#!/bin/bash
# ============================================================
# OneUptime Cron Job Heartbeat Monitor Setup
# ============================================================
ONEUPTIME_URL="${oneuptimeUrl}"
PROJECT_ID="${projectId}"
API_KEY="YOUR_API_KEY"
# ============================================================

set -e

if [ -z "$API_KEY" ] || [ "$API_KEY" = "YOUR_API_KEY" ]; then
  echo "ERROR: Set API_KEY (export API_KEY=...)"
  exit 1
fi

TEMP_CRONTAB=$(mktemp)
NEW_CRONTAB=$(mktemp)
MONITORS_CREATED=0

crontab -l > "$TEMP_CRONTAB" 2>/dev/null || true
cp "$TEMP_CRONTAB" "/tmp/crontab.backup.$(date +%s)"

echo ""
echo "=== OneUptime Cron Job Heartbeat Setup ==="
echo ""

estimate_interval() {
  local min hr dom mon dow
  min="$1"; hr="$2"; dom="$3"; mon="$4"; dow="$5"
  if [ "$min" = "*" ] && [ "$hr" = "*" ]; then echo 5; return; fi
  local interval=0
  case "$min" in "*") interval=60 ;; "*/"*) interval="\${min#*/}" ;; [0-9]*) interval=1440 ;; esac
  if [ "$hr" != "*" ]; then
    case "$hr" in "*/"*) local h="\${hr#*/}"; interval=$((interval < h * 60 ? interval : h * 60)) ;; [0-9]*) interval=1440 ;; esac
  fi
  [ "$dow" != "*" ] && interval=10080
  [ "$dom" != "*" ] && interval=43200
  [ "$interval" -le 0 ] && interval=60
  echo "$interval"
}

sanitize_name() {
  echo "$1" | sed 's|/||g' | tr -c '[:alnum:]_-' ' ' | xargs | head -c 80
}

while IFS= read -r line || [ -n "$line" ]; do
  case "$line" in ''|\\#*|[A-Za-z_]*=*) echo "$line" >> "$NEW_CRONTAB"; continue ;; esac
  cron_fields=$(echo "$line" | awk '{
    if (NF >= 6 && $1 ~ /^[0-9*,@\\/-]+$/ && $2 ~ /^[0-9*,@\\/-]+$/ && $3 ~ /^[0-9*,@\\/?-]+$/ && $4 ~ /^[0-9*,@\\/?-]+$/ && $5 ~ /^[0-9*,@\\/?-]+$/)
      print $1, $2, $3, $4, $5
  }')
  [ -z "$cron_fields" ] && echo "$line" >> "$NEW_CRONTAB" && continue
  cmd=$(echo "$line" | awk '{ sub(/^[[:space:]]*([0-9*,@\\/-]+[[:space:]]+){5}/, ""); print }')
  min=$(echo "$cron_fields" | awk '{print $1}'); hr=$(echo "$cron_fields" | awk '{print $2}')
  dom=$(echo "$cron_fields" | awk '{print $3}'); mon=$(echo "$cron_fields" | awk '{print $4}')
  dow=$(echo "$cron_fields" | awk '{print $5}')
  interval_min=$(estimate_interval "$min" "$hr" "$dom" "$mon" "$dow")
  monitor_name=$(sanitize_name "$cmd")
  [ -z "$monitor_name" ] && monitor_name="cron-job-$(date +%s)"
  echo "  Found: $monitor_name (every \${interval_min}min)"
  response=$(curl -s -X POST "$ONEUPTIME_URL/api/monitor" \
    -H "Content-Type: application/json" -H "apikey: $API_KEY" \
    -d "{\\"data\\": {\\"projectId\\": \\"$PROJECT_ID\\", \\"name\\": \\"Cron: $monitor_name\\", \\"monitorType\\": \\"Incoming Request\\"}}")
  secret_key=$(echo "$response" | grep -o '"incomingRequestSecretKey":"[^"]*"' | head -1 | sed 's/"incomingRequestSecretKey":"//;s/"//')
  monitor_id=$(echo "$response" | grep -o '"_id":[^,]*' | head -1 | sed 's/"_id"://;s/"//g')
  if [ -z "$secret_key" ]; then echo "  ERROR creating monitor: $response"; echo "$line" >> "$NEW_CRONTAB"; continue; fi
  echo "  Created: $ONEUPTIME_URL/dashboard/$PROJECT_ID/monitor/$monitor_id"
  heartbeat_url="$ONEUPTIME_URL/heartbeat/$secret_key"
  case "$cmd" in *\\;*|*\\&\\&*) new_cmd="$cmd; curl -fsSL -o /dev/null $heartbeat_url" ;; *) new_cmd="$cmd && curl -fsSL -o /dev/null $heartbeat_url" ;; esac
  echo "$min $hr $dom $mon $dow $new_cmd" >> "$NEW_CRONTAB"
  MONITORS_CREATED=$((MONITORS_CREATED + 1))
done < "$TEMP_CRONTAB"

crontab "$NEW_CRONTAB"
rm -f "$TEMP_CRONTAB" "$NEW_CRONTAB"

echo ""
echo "=== Complete: $MONITORS_CREATED monitors created ==="
echo "Backup: /tmp/crontab.backup.*"
`;
  };

  const handleDownload: () => void = (): void => {
    const blob: Blob = new Blob([getScript()], { type: "text/x-shellscript" });
    const url: string = URL.createObjectURL(blob);
    const a: HTMLAnchorElement = document.createElement("a");
    a.href = url;
    a.download = "oneuptime-cron-setup.sh";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card
      title={`Monitorar Cron Jobs (como Cronitor)`}
      description={
        <div className="space-y-2 w-full mt-5">
          <p className="text-gray-600 text-sm">
            Este script varre os cron jobs da máquina, cria um monitor
            IncomingRequest no OneUptime para cada job e instala chamadas de
            heartbeat no crontab. Se um cron job não rodar no tempo esperado, o
            OneUptime dispara um alerta.
          </p>

          <ol className="text-sm text-gray-600 list-decimal ml-4 space-y-1">
            <li>
              Crie uma <strong>API Key</strong> em{" "}
              <strong>Settings &rarr; API Keys</strong> com permissão de escrita
              em Monitors.
            </li>
            <li>
              Execute o comando abaixo na máquina onde os cron jobs rodam
              (substitua <code>sua-api-key-aqui</code> pela sua chave):
            </li>
          </ol>

          <CodeBlock language="bash" code={curlCommand} />

          <p className="text-gray-600 text-sm">
            Ou baixe o script e execute manualmente:
          </p>

          <div className="flex justify-end mb-2">
            <Button
              title="Download Script"
              buttonStyle={ButtonStyleType.NORMAL}
              icon={IconProp.Download}
              onClick={handleDownload}
              small={true}
            />
          </div>
        </div>
      }
    />
  );
};

export default CronJobHeartbeatScript;
