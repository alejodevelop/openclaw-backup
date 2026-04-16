# Frontdesk Inbox

Bandeja estructurada para recados, solicitudes y citas dirigidas a Alejo.

## Objetivo
Registrar cada asunto relevante como ticket antes de prometer seguimiento, para que Alejo pueda revisarlo después de forma organizada.

## Estructura
- `./tickets/` → un archivo Markdown por ticket
- `./ledger.jsonl` → índice append-only con una línea JSON por ticket
- `./PENDING.md` → vista humana rápida de pendientes
- `./templates/TICKET_TEMPLATE.md` → formato base del ticket

## Tipos de ticket
- `recado`
- `solicitud`
- `cita`
- `urgente`
- `otro`

## Prioridades
- `high` → urgente, sensible al tiempo o requiere atención pronta
- `medium` → requiere revisión de Alejo, pero no inmediata
- `low` → mensaje informativo o recado simple

## Estados
- `pending`
- `reviewing`
- `resolved`
- `discarded`

## Regla operativa clave
No decir “ya le avisé a Alejo” si no hubo notificación real.
Sí se puede decir “ya quedó registrado para revisión” cuando el ticket ya existe.

## Cómo revisarlo desde la sesión privada de Alejo
Pídele a Jarvis cosas como:
- "muéstrame la bandeja"
- "qué pendientes hay"
- "qué dejó Jota"
- "muéstrame las citas pendientes"
- "marca el ticket FD-... como resuelto"
