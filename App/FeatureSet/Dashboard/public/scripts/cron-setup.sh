#!/bin/bash
# ============================================================
# OneUptime Cron Job Heartbeat Monitor Setup
# ============================================================
# Scans crontab, creates IncomingRequest monitors in OneUptime
# for each cron job, and installs heartbeat calls.
#
# Usage:
#   curl -fsSL https://oneuptime.com/scripts/cron-setup.sh | \
#     ONEUPTIME_URL=<url> PROJECT_ID=<id> API_KEY=<key> bash
#
# Or:
#   export ONEUPTIME_URL=https://oneuptime.com
#   export PROJECT_ID=your-project-id
#   export API_KEY=your-api-key
#   ./cron-setup.sh
# ============================================================

set -e

# ---------- CONFIGURATION (via env vars) ----------
ONEUPTIME_URL="${ONEUPTIME_URL:-}"
PROJECT_ID="${PROJECT_ID:-}"
API_KEY="${API_KEY:-}"
# --------------------------------------------------

# Validate config
if [ -z "$API_KEY" ]; then
  echo "ERROR: API_KEY not set."
  echo "Usage: curl -fsSL https://oneuptime.com/scripts/cron-setup.sh | ONEUPTIME_URL=<url> PROJECT_ID=<id> API_KEY=<key> bash"
  exit 1
fi

if [ -z "$PROJECT_ID" ]; then
  echo "ERROR: PROJECT_ID not set."
  exit 1
fi

if [ -z "$ONEUPTIME_URL" ]; then
  echo "ERROR: ONEUPTIME_URL not set."
  exit 1
fi

# Temp files
TEMP_CRONTAB=$(mktemp)
NEW_CRONTAB=$(mktemp)
MONITORS_CREATED=0

# Backup existing crontab
crontab -l > "$TEMP_CRONTAB" 2>/dev/null || true
cp "$TEMP_CRONTAB" "/tmp/crontab.backup.$(date +%s)"

echo ""
echo "=== OneUptime Cron Job Heartbeat Setup ==="
echo "URL:       $ONEUPTIME_URL"
echo "ProjectID: $PROJECT_ID"
echo ""

# Estimate interval in minutes from a cron schedule
estimate_interval() {
  local min hr dom mon dow
  min="$1"; hr="$2"; dom="$3"; mon="$4"; dow="$5"

  if [ "$min" = "*" ] && [ "$hr" = "*" ]; then
    echo 5
    return
  fi

  local interval=0

  case "$min" in
    "*")      interval=60 ;;
    "*/"*)    interval="${min#*/}" ;;
    [0-9]*)   interval=1440 ;;
  esac

  if [ "$hr" != "*" ] && [ "$hr" != "*/1" ]; then
    case "$hr" in
      "*/"*)  local h="${hr#*/}"; interval=$((interval < h * 60 ? interval : h * 60)) ;;
      [0-9]*) interval=1440 ;;
    esac
  fi

  if [ "$dow" != "*" ]; then
    interval=10080
  fi

  if [ "$dom" != "*" ]; then
    interval=43200
  fi

  if [ "$interval" -le 0 ]; then
    interval=60
  fi

  echo "$interval"
}

sanitize_name() {
  local cmd="$1"
  local name
  name=$(echo "$cmd" | sed 's|/||g' | tr -c '[:alnum:]_-' ' ' | xargs | head -c 80)
  if [ -z "$name" ]; then
    name="cron-job-$(date +%s)"
  fi
  echo "$name"
}

echo "Reading crontab entries..."
echo ""

while IFS= read -r line || [ -n "$line" ]; do
  case "$line" in
    ''|\#*|[A-Za-z_]*=*)
      echo "$line" >> "$NEW_CRONTAB"
      continue ;;
  esac

  cron_fields=$(echo "$line" | awk '{
    if (NF >= 6 && $1 ~ /^[0-9*,@\/-]+$/ && $2 ~ /^[0-9*,@\/-]+$/ && $3 ~ /^[0-9*,@\/?-]+$/ && $4 ~ /^[0-9*,@\/?-]+$/ && $5 ~ /^[0-9*,@\/?-]+$/) {
      print $1, $2, $3, $4, $5
    }
  }')

  if [ -z "$cron_fields" ]; then
    echo "$line" >> "$NEW_CRONTAB"
    continue
  fi

  cmd=$(echo "$line" | awk '{
    sub(/^[[:space:]]*([0-9*,@\/-]+[[:space:]]+){5}/, "")
    print
  }')

  min=$(echo "$cron_fields" | awk '{print $1}')
  hr=$(echo "$cron_fields" | awk '{print $2}')
  dom=$(echo "$cron_fields" | awk '{print $3}')
  mon=$(echo "$cron_fields" | awk '{print $4}')
  dow=$(echo "$cron_fields" | awk '{print $5}')

  interval_min=$(estimate_interval "$min" "$hr" "$dom" "$mon" "$dow")
  monitor_name=$(sanitize_name "$cmd")

  echo "  Found: $monitor_name (every ${interval_min}min)"

  response=$(curl -s -X POST "$ONEUPTIME_URL/api/monitor" \
    -H "Content-Type: application/json" \
    -H "apikey: $API_KEY" \
    -d "{
      \"data\": {
        \"projectId\": \"$PROJECT_ID\",
        \"name\": \"Cron: $monitor_name\",
        \"monitorType\": \"Incoming Request\"
      }
    }")

  secret_key=$(echo "$response" | grep -o '"incomingRequestSecretKey":"[^"]*"' | head -1 | sed 's/"incomingRequestSecretKey":"//;s/"//')
  monitor_id=$(echo "$response" | grep -o '"_id":[^,]*' | head -1 | sed 's/"_id"://;s/"//g')

  if [ -z "$secret_key" ]; then
    echo "  ERROR: Failed to create monitor. Response:"
    echo "  $response"
    echo "$line" >> "$NEW_CRONTAB"
    continue
  fi

  echo "  Created monitor: $ONEUPTIME_URL/dashboard/$PROJECT_ID/monitor/$monitor_id"

  heartbeat_url="$ONEUPTIME_URL/heartbeat/$secret_key"

  case "$cmd" in
    *\;*|*\&\&*)
      new_cmd="$cmd; curl -fsSL -o /dev/null $heartbeat_url" ;;
    *)
      new_cmd="$cmd && curl -fsSL -o /dev/null $heartbeat_url" ;;
  esac

  new_line="$min $hr $dom $mon $dow $new_cmd"
  echo "$new_line" >> "$NEW_CRONTAB"
  MONITORS_CREATED=$((MONITORS_CREATED + 1))
done < "$TEMP_CRONTAB"

crontab "$NEW_CRONTAB"
rm -f "$TEMP_CRONTAB" "$NEW_CRONTAB"

echo ""
echo "=== Setup Complete ==="
echo "Monitors created: $MONITORS_CREATED"
echo ""
echo "Next steps:"
echo "  1. Go to OneUptime Dashboard to configure alert criteria"
echo "  2. For each monitor, set 'Not Received In Minutes' to the expected interval"
echo "  3. Configure notification rules"
echo ""
echo "Backup saved to: /tmp/crontab.backup.*"
echo ""
