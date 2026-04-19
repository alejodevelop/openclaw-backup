#!/usr/bin/env bash
set -euo pipefail

ACCOUNT="alejo.ai.agent@gmail.com"
WORKDIR="/home/acabarcas/.openclaw/workspace"
LOCAL_LOG_DIR="$WORKDIR/logs/hases"
TMP_DIR="${TMPDIR:-/tmp}/hases-monitor"
DATE_BOGOTA="$(TZ=America/Bogota date '+%Y-%m-%d')"
STAMP_BOGOTA="$(TZ=America/Bogota date '+%Y-%m-%d %H:%M:%S %Z')"
STAMP_UTC="$(date -u '+%Y-%m-%d %H:%M:%S UTC')"
LOG_FILE="$LOCAL_LOG_DIR/hases-status-$DATE_BOGOTA.txt"
URLS=(
  "https://www.hases.org/"
  "https://hases-web.vercel.app/"
)

mkdir -p "$LOCAL_LOG_DIR" "$TMP_DIR"

json_escape() {
  node -e 'process.stdout.write(JSON.stringify(process.argv[1]))' "$1"
}

check_url() {
  local url="$1"
  local body="$TMP_DIR/body.$$"
  local headers="$TMP_DIR/headers.$$"
  local metrics
  metrics=$(curl -sS -L \
    --connect-timeout 15 \
    --max-time 30 \
    -o "$body" \
    -D "$headers" \
    -w 'final_url=%{url_effective}\nhttp_code=%{http_code}\ncontent_type=%{content_type}\nremote_ip=%{remote_ip}\ntime_total=%{time_total}\nsize_download=%{size_download}\nssl_verify=%{ssl_verify_result}\n' \
    "$url")

  local title=""
  title=$(grep -oPm1 '(?i)(?<=<title>)[^<]+' "$body" || true)
  local etag=""
  etag=$(awk 'BEGIN{IGNORECASE=1} /^etag:/ {sub(/\r$/, "", $0); sub(/^[^:]*:[[:space:]]*/, "", $0); print; exit}' "$headers" || true)
  local server=""
  server=$(awk 'BEGIN{IGNORECASE=1} /^server:/ {sub(/\r$/, "", $0); sub(/^[^:]*:[[:space:]]*/, "", $0); print; exit}' "$headers" || true)
  local xvercel=""
  xvercel=$(awk 'BEGIN{IGNORECASE=1} /^x-vercel-id:/ {sub(/\r$/, "", $0); sub(/^[^:]*:[[:space:]]*/, "", $0); print; exit}' "$headers" || true)

  printf '%s\n' "URL: $url"
  printf '%s\n' "$metrics"
  printf 'title=%s\n' "$title"
  printf 'etag=%s\n' "$etag"
  printf 'server=%s\n' "$server"
  printf 'x_vercel_id=%s\n' "$xvercel"
  echo

  rm -f "$body" "$headers"
}

summarize() {
  local file="$1"
  local ok_count total_count
  ok_count=$(grep -c '^http_code=200$' "$file" || true)
  total_count=$(grep -c '^http_code=' "$file" || true)
  local verdict="OK"
  if [[ "$total_count" -lt 2 ]] || [[ "$ok_count" -lt "$total_count" ]]; then
    verdict="WARN"
  fi
  printf '%s' "$verdict"
}

{
  echo "HASES daily status"
  echo "Date (Bogota): $DATE_BOGOTA"
  echo "Checked at (Bogota): $STAMP_BOGOTA"
  echo "Checked at (UTC): $STAMP_UTC"
  echo "Host: $(hostname)"
  echo ""
  for url in "${URLS[@]}"; do
    check_url "$url"
  done
  SUMMARY=$(summarize "$LOG_FILE.tmp")
} > "$LOG_FILE.tmp"

SUMMARY=$(summarize "$LOG_FILE.tmp")
{
  echo "Summary: $SUMMARY"
  echo ""
  cat "$LOG_FILE.tmp"
} > "$LOG_FILE"
rm -f "$LOG_FILE.tmp"

ensure_drive_folder() {
  local name="$1"
  local parent="$2"
  local q
  if [[ -n "$parent" ]]; then
    q="name = '$name' and mimeType = 'application/vnd.google-apps.folder' and '$parent' in parents and trashed = false"
  else
    q="name = '$name' and mimeType = 'application/vnd.google-apps.folder' and 'root' in parents and trashed = false"
  fi
  local out
  if ! out=$(gog drive search --json --results-only --raw-query "$q" -a "$ACCOUNT" --no-input 2>/dev/null); then
    return 10
  fi
  local id
  id=$(node - <<'NODE' "$out"
const raw = process.argv[2] || '[]';
let data;
try { data = JSON.parse(raw); } catch { data = []; }
if (Array.isArray(data) && data.length > 0) {
  const first = data[0];
  process.stdout.write(first.id || first.fileId || '');
}
NODE
)
  if [[ -n "$id" ]]; then
    printf '%s' "$id"
    return 0
  fi

  if [[ -n "$parent" ]]; then
    out=$(gog drive mkdir "$name" --json --results-only --parent "$parent" -a "$ACCOUNT" --no-input)
  else
    out=$(gog drive mkdir "$name" --json --results-only -a "$ACCOUNT" --no-input)
  fi
  node - <<'NODE' "$out"
const raw = process.argv[2] || '{}';
let data;
try { data = JSON.parse(raw); } catch { data = {}; }
process.stdout.write(data.id || data.fileId || '');
NODE
}

upload_to_drive() {
  local clientes_id hases_id logs_id
  clientes_id=$(ensure_drive_folder "clientes" "") || return $?
  hases_id=$(ensure_drive_folder "hases" "$clientes_id") || return $?
  logs_id=$(ensure_drive_folder "logs" "$hases_id") || return $?
  gog drive upload "$LOG_FILE" --name "$(basename "$LOG_FILE")" --parent "$logs_id" -a "$ACCOUNT" --no-input >/dev/null
}

DRIVE_STATUS="pending"
if upload_to_drive; then
  DRIVE_STATUS="uploaded"
else
  DRIVE_STATUS="drive_not_ready"
fi

echo "drive_status=$DRIVE_STATUS" >> "$LOG_FILE"
