# Local TTS for Jarvis

TTS local en el servidor, sin depender de un proveedor pago externo.

## Objetivo

Permitir que Jarvis responda en audio usando síntesis local, con dos modos de uso:
- **modo texto**: responde solo en texto
- **modo audio**: responde con nota de voz generada localmente

## Arquitectura

- **Motor TTS**: Piper
- **Shim HTTP local**: endpoint compatible con `POST /audio/speech`
- **Formato de entrega**: OGG/Opus para notas de voz
- **Preprocesado**: normalización simple para pronunciación en español de marcas, siglas y términos técnicos
- **Postproceso**: perfiles de timbre/cadencia con ffmpeg

## Estructura

- `bin/` runtime local de Piper (no versionado)
- `voices/` modelos de voz descargados (no versionado)
- `service/server.mjs` servidor HTTP local
- `service/text-normalize.mjs` normalización de texto para español
- `run.sh` arranque del servicio
- `say.sh` helper CLI para generar audio desde texto
- `tmp/` artefactos temporales (no versionado)

## Endpoint local

- URL: `http://127.0.0.1:8091/audio/speech`
- Health: `http://127.0.0.1:8091/healthz`
- Auth: `Authorization: Bearer local-tts`

## Request soportado

Campos principales:
- `model`
- `input`
- `voice`
- `response_format` = `mp3 | opus | wav | pcm`
- `profile` = `default | deep_male | male_serene`

## Voces probadas

- `es_MX-ald-medium`
- `es_MX-claude-high`
- `es_ES-davefx-medium`

## Resultado actual elegido

La base preferida para Jarvis quedó así:
- **voz base**: `es_ES-davefx-medium`
- **perfil preferido**: `male_serene`

Motivo: fue la dirección de voz que Alejo prefirió después de comparar claridad, carácter masculino y cadencia.

## Perfiles

### `default`
Sin postproceso adicional.

### `deep_male`
Hace la voz más grave/profunda.

### `male_serene`
Mantiene una voz masculina seria y la vuelve un poco más serena, con cadencia más controlada.

## Uso rápido

### Health check

```bash
curl -s http://127.0.0.1:8091/healthz
```

### Generar una nota de voz desde texto

```bash
cat <<'EOF' >/tmp/test.txt
Hola Alejo. Soy Jarvis.
EOF

bash tools/local-tts/say.sh opus /tmp/test.ogg es_ES-davefx-medium /tmp/test.txt
```

### Llamada directa al endpoint

```bash
curl -sS \
  -H 'Authorization: Bearer local-tts' \
  -H 'Content-Type: application/json' \
  -d '{
    "model": "local-piper",
    "input": "Hola Alejo. Soy Jarvis.",
    "voice": "es_ES-davefx-medium",
    "response_format": "opus",
    "profile": "male_serene"
  }' \
  http://127.0.0.1:8091/audio/speech -o /tmp/jarvis.ogg
```

## Estado por chat

Archivo previsto:
- `state/audio-mode.json`

Uso esperado por chat:
- `text`: responder solo en texto
- `audio`: responder en audio

## Alternancia de modo

A nivel de producto, la intención es:
- si el chat está en `text`, Jarvis responde por texto
- si el chat está en `audio`, Jarvis responde con la ruta local TTS

**Importante:**
La ruta local ya funciona y se probó con envíos reales, pero la integración nativa final con `/tts` de OpenClaw todavía necesita un ajuste adicional para quedar completamente enchufada al provider local.

## Pendiente

- terminar el enganche nativo de OpenClaw para que el modo audio no dependa de la ruta manual/local intermedia
- dejar persistente el servicio local de TTS mediante systemd o un supervisor equivalente
- conectar el cambio de modo texto/audio a un comando simple de usuario

## Notas

- No versionar `bin/`, `voices/` ni `tmp/`
- No subir audios temporales al repo
- Mantener la voz elegida y ajustar primero ritmo/perfil antes de volver a probar otra voz distinta
