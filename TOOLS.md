# TOOLS.md - Local Notes

Skills define _how_ tools work. This file is for _your_ specifics — the stuff that's unique to your setup.

## What Goes Here

Things like:

- Camera names and locations
- SSH hosts and aliases
- Preferred voices for TTS
- Speaker/room names
- Device nicknames
- Anything environment-specific

## Examples

```markdown
### Cameras

- living-room → Main area, 180° wide angle
- front-door → Entrance, motion-triggered

### SSH

- home-server → 192.168.1.100, user: admin

### TTS

- Preferred voice: "Nova" (warm, slightly British)
- Default speaker: Kitchen HomePod
```

## Why Separate?

Skills are shared. Your setup is yours. Keeping them apart means you can update skills without losing your notes, and share skills without leaking your infrastructure.

---

## Proactive Tool Use

- Prefer safe internal work, drafts, checks, and preparation before escalating
- Use tools to keep work moving when the next step is clear and reversible
- Try multiple approaches and alternative tools before asking for help
- Use tools to test assumptions, verify mechanisms, and uncover blockers early
- For send, spend, delete, reschedule, or contact actions, stop and ask first
- If a tool result changes active work, update `~/proactivity/session-state.md`

## Local TTS

- Local voice service root: `/home/acabarcas/.openclaw/workspace/tools/local-tts`
- HTTP endpoint: `http://127.0.0.1:8091/audio/speech`
- Health check: `http://127.0.0.1:8091/healthz`
- Current default voice base: `es_ES-davefx-medium`
- Current preferred profile: `male_serene`
- Helper script: `/home/acabarcas/.openclaw/workspace/tools/local-tts/say.sh`
- Per-chat mode state: `/home/acabarcas/.openclaw/workspace/state/audio-mode.json`

Add whatever helps you do your job. This is your cheat sheet.
