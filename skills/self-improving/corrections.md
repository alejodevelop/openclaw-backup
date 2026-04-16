# Corrections Log — Template

> This file is created in `~/self-improving/corrections.md` when you first use the skill.
> Keeps the last 50 corrections. Older entries are evaluated for promotion or archived.

## Example Entries

```markdown
## 2026-02-19

### 14:32 — Code style
- **Correction:** "Use 2-space indentation, not 4"
- **Context:** Editing TypeScript file
- **Count:** 1 (first occurrence)

### 16:15 — Communication
- **Correction:** "Don't start responses with 'Great question!'"
- **Context:** Chat response
- **Count:** 3 → **PROMOTED to memory.md**

## 2026-02-18

### 09:00 — Project: website
- **Correction:** "For this project, always use Tailwind"
- **Context:** CSS discussion
- **Action:** Added to projects/website.md
```

## Log Format

Each entry includes:
- **Timestamp** — When the correction happened
- **Correction** — What the user said
- **Context** — What triggered it
- **Count** — How many times (for promotion tracking)
- **Action** — Where it was stored (if promoted)

## 2026-04-16

### 04:10 — Frontdesk inbox enforcement
- **Correction:** For frontdesk intake, a natural-language prompt was not enough to make the agent register tickets. Use a mandatory step-by-step protocol with explicit inbox triggers and required tool actions before any user-visible reply.
- **Context:** WhatsApp frontdesk handled an urgent message from Alejo's girlfriend but replied without creating a ticket, updating the queue, or notifying Alejo.
- **Count:** 1 (first occurrence)
- **Action:** Hardened `frontdesk/AGENTS.md` and `frontdesk/TOOLS.md` with required execution order, urgent examples, and no-promise-on-failure rules.
