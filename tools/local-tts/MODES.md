# Modos de respuesta: texto y audio

## Objetivo

Tener dos modos sencillos para Jarvis por chat:

- **texto**: responde solo por escrito
- **audio**: responde con nota de voz generada localmente

## Estado actual

La síntesis local ya funciona y puede generar/enviar audios reales.

El archivo de estado previsto es:
- `state/audio-mode.json`

Ejemplo de estructura:

```json
{
  "telegram:6382026695": {
    "mode": "text",
    "voice": "es_ES-davefx-medium",
    "profile": "male_serene",
    "updatedAt": "2026-04-17T22:10:00Z"
  }
}
```

## Operación manual actual

Hasta cerrar el enganche nativo final, la forma conceptual de alternar es:

- poner `mode: text` → respuestas normales por texto
- poner `mode: audio` → respuestas por audio usando la ruta local

## Comandos deseados

La intención final es exponer algo tipo:

- `/modo texto`
- `/modo audio`

O equivalente dentro de OpenClaw.

## Voz actual recomendada

- `voice`: `es_ES-davefx-medium`
- `profile`: `male_serene`
