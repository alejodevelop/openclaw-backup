# Estado actual del TTS local

## Hecho

- Piper instalado localmente en el servidor
- endpoint local compatible con `/audio/speech`
- generación real de audio en `opus`, `mp3`, `wav` y `pcm`
- entrega real de notas de voz por Telegram
- normalización básica de texto para pronunciación en español
- comparación de múltiples voces
- perfil elegido por Alejo: base masculina `es_ES-davefx-medium` con perfil `male_serene`

## Falta

- conexión nativa final con el `/tts` de OpenClaw
- persistencia tipo servicio del proceso local
- cambio de modo texto/audio expuesto como UX simple para Alejo
