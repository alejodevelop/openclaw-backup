#!/usr/bin/env python3
import json, sys, os
from datetime import datetime, timezone

if len(sys.argv) < 3:
    print('Usage: set-mode.py <chat-key> <text|audio> [voice] [profile]', file=sys.stderr)
    sys.exit(1)

chat_key = sys.argv[1]
mode = sys.argv[2]
voice = sys.argv[3] if len(sys.argv) > 3 else 'es_ES-davefx-medium'
profile = sys.argv[4] if len(sys.argv) > 4 else 'male_serene'

if mode not in {'text', 'audio'}:
    raise SystemExit('mode must be text or audio')

path = os.path.expanduser('/home/acabarcas/.openclaw/workspace/state/audio-mode.json')
os.makedirs(os.path.dirname(path), exist_ok=True)

data = {}
if os.path.exists(path):
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)

data[chat_key] = {
    'mode': mode,
    'voice': voice,
    'profile': profile,
    'updatedAt': datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace('+00:00', 'Z')
}

with open(path, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
    f.write('\n')

print(path)
