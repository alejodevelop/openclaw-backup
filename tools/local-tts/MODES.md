# Modos de respuesta: texto y audio

## Objetivo

Tener dos modos sencillos para Abel por chat:

- **texto**: responde solo por escrito
- **audio**: responde con nota de voz generada localmente

## Conmutador recomendado en Telegram

La forma simple y correcta es usar el comando nativo de OpenClaw:

- `/tts on` → activa respuestas en audio
- `/tts off` → vuelve a respuestas en texto
- `/tts status` → muestra el estado actual

Esto ya funciona con el backend local configurado.

## Estado local adicional

Sigue existiendo un archivo de estado auxiliar:
- `state/audio-mode.json`

Ese archivo sirve como referencia operativa local, pero para Telegram el conmutador recomendado es `/tts on` y `/tts off`.

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

## Alternativa manual/local

También existen helpers locales:

```bash
bash tools/local-tts/mode.sh telegram:6382026695 text
bash tools/local-tts/mode.sh telegram:6382026695 audio
```

Pero para el uso diario de Alejo en Telegram, preferir `/tts on` y `/tts off`.

## Sobre comandos tipo `/text_mode`

Técnicamente podrían añadirse entradas de menú o una skill específica, pero no hace falta para resolver el caso de uso y añade complejidad innecesaria. La solución más limpia es reutilizar `/tts`.

## Voz actual recomendada

- `voice`: `es_ES-davefx-medium`
- `profile`: `male_serene`
