# Local TTS for Abel

TTS local en el servidor, sin depender de un proveedor pago externo.

## Objetivo

Permitir que Abel responda en audio usando síntesis local, con dos modos de uso:
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

La base preferida para Abel quedó así:
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
Hola Alejo. Soy Abel.
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
    "input": "Hola Alejo. Soy Abel.",
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

Para uso diario en Telegram, usar los comandos nativos de OpenClaw:

- `/tts on` → activa respuestas en audio
- `/tts off` → desactiva respuestas en audio
- `/tts status` → muestra el estado actual

La configuración local actual permite que `/tts` use el backend local configurado.

También existe una capa auxiliar local basada en `state/audio-mode.json` y helpers CLI, pero no hace falta para la operación normal de Alejo.

## Persistencia del servicio

El backend local quedó instalado como servicio de usuario systemd:

- unit: `~/.config/systemd/user/local-tts.service`
- estado esperado: `systemctl --user status local-tts.service`
- arranque automático: **habilitado** (`enable --now`)
- política de recuperación: `Restart=always`

Esto hace que el TTS local vuelva automáticamente tras reinicios del servidor, reinicio de sesión de usuario o caída del proceso.

## Pendiente

- opcional: exponer un alias más bonito tipo `/modo_audio` o `/modo_texto`, pero solo si de verdad aporta valor frente a `/tts on|off`

## Notas

- No versionar `bin/`, `voices/` ni `tmp/`
- No subir audios temporales al repo
- Mantener la voz elegida y ajustar primero ritmo/perfil antes de volver a probar otra voz distinta
