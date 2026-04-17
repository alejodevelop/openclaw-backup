#!/usr/bin/env bash
set -euo pipefail
SCRIPT="/home/acabarcas/.openclaw/workspace/tools/ytmusic/spotify_cdp.js"
run() {
  echo "===== $* ====="
  node "$SCRIPT" "$@"
  echo
}
run status
run play-title-exact "Los Malaventurados No Lloran"
run pause
run resume
run next
run previous
run status
