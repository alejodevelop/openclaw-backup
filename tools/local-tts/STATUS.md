# Estado actual del TTS local

## Hecho

- Piper instalado localmente en el servidor
- endpoint local compatible con `/audio/speech`
- generación real de audio en `opus`, `mp3`, `wav` y `pcm`
- entrega real de notas de voz por Telegram
- normalización básica de texto para pronunciación en español
- comparación de múltiples voces
- perfil elegido por Alejo: base masculina `es_ES-davefx-medium` con perfil `male_serene`

## Estado actual

- conexión nativa con el `/tts` de OpenClaw: **operativa**
- persistencia tipo servicio del proceso local: **operativa** mediante `systemd --user`
- cambio de modo texto/audio para Alejo: **operativo** con `/tts on` y `/tts off`

## Causa del fallo corregido

- el backend local en `127.0.0.1:8091` estaba caído
- no existía una unit persistente para levantarlo tras reinicios o caídas
- además el TTS local por chat estaba en `off` en `~/.openclaw/settings/tts.json`
