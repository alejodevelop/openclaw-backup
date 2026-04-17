#!/usr/bin/env bash
set -euo pipefail
if [ "$#" -lt 2 ]; then
  echo "Usage: $0 <chat-key> <text|audio> [voice] [profile]" >&2
  exit 1
fi
exec python3 /home/acabarcas/.openclaw/workspace/tools/local-tts/set-mode.py "$@"
