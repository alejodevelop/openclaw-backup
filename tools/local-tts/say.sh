#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -lt 2 ]; then
  echo "Usage: $0 <format: mp3|opus|wav|pcm> <output-path> [voice] [text-file|-]" >&2
  exit 1
fi

FORMAT="$1"
OUT="$2"
VOICE="${3:-es_MX-ald-medium}"
TEXT_SOURCE="${4:--}"
API_URL="${LOCAL_TTS_URL:-http://127.0.0.1:8091/audio/speech}"
API_KEY="${LOCAL_TTS_API_KEY:-local-tts}"
MODEL="${LOCAL_TTS_MODEL:-local-piper}"

if [ "$TEXT_SOURCE" = "-" ]; then
  TEXT="$(cat)"
else
  TEXT="$(cat "$TEXT_SOURCE")"
fi

mkdir -p "$(dirname "$OUT")"
JSON_PAYLOAD=$(python3 - <<'PY' "$MODEL" "$TEXT" "$VOICE" "$FORMAT"
import json, sys
print(json.dumps({
  'model': sys.argv[1],
  'input': sys.argv[2],
  'voice': sys.argv[3],
  'response_format': sys.argv[4]
}, ensure_ascii=False))
PY
)

curl -sS -H "Authorization: Bearer ${API_KEY}" -H 'Content-Type: application/json' \
  -d "$JSON_PAYLOAD" "$API_URL" -o "$OUT"

echo "$OUT"
