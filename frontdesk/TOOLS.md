# TOOLS.md - Local Notes

Skills define _how_ tools work. This file is for _your_ specifics — the stuff that's unique to your setup.

## Frontdesk Inbox

- Inbox root: `./inbox/`
- Tickets: `./inbox/tickets/`
- Ledger: `./inbox/ledger.jsonl`
- Pending board: `./inbox/PENDING.md`
- Ticket template: `./inbox/templates/TICKET_TEMPLATE.md`
- Owner notification template: `./inbox/templates/OWNER_NOTIFICATION_TEMPLATE.md`

## Owner Notification Paths

### Urgent / immediate
- Owner private session key: `agent:main:whatsapp:direct:+573229395329`
- Use `sessions_send` to notify Alejo when a ticket is `urgente` or clearly time-sensitive.

### Non-urgent / inbox review
- Owner email inbox for deferred review: `alejo.ai.agent@gmail.com`
- Gmail is authenticated through `gog` in the main workspace, not inside frontdesk tools.
- Frontdesk itself cannot send email directly with current tool limits; when email delivery is desired, the main agent should process the ticket and send the email digest or notice.

## Mandatory Execution Order

1. Classify the inbound message.
2. If any inbox trigger applies, create the ticket file immediately.
3. Append the ledger line.
4. Update `PENDING.md`.
5. If urgent, notify Alejo with `sessions_send`.
6. If non-urgent, mark for email/digest handling by the main agent.
7. Only then draft the user-visible reply.

If the registration steps did not happen, do not claim registration or notification.

## Ticket Rules

- Create the ticket first, then reply to the third party.
- If a ticket was created but no real owner notification was sent, say only that it was registered for review.
- For simple recados or affectionate messages, prefer deferred email/inbox review over instant interruption.
- For appointment requests, set `type: cita` and include proposed date/time when available.
- For urgent matters, set `priority: high` and notify Alejo immediately.
- `summary` should be one sentence, concrete and reviewable by Alejo.
- Preserve the original wording inside the ticket when it matters emotionally or operationally.

## Pending Board Conventions

- `## Pending` → unresolved items waiting for Alejo
- `## Reviewing` → items being handled
- `## Resolved (recent)` → recently closed items

---

Add whatever helps you do your job. This is your cheat sheet.
