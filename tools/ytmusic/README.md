# YouTube Music remote-control capability

Goal: let Abel inspect current playback and control playback for the Google account `alejo.ai.agent@gmail.com` on active devices.

## Constraints discovered
- YouTube Music blocks the default headless browser profile used by OpenClaw.
- OAuth + YouTube Data API does not expose a reliable now-playing/device-control surface for YouTube Music web playback.
- SMTP/IMAP app-password access works, but that is unrelated to web playback control.
- Device nodes are not currently paired, so there is no direct phone-control path right now.

## Reliable path
Use Alejo's own logged-in Chromium/Chrome session as a remote-debugging target, then let Abel attach to that browser session.

### One-time setup on Alejo's machine
1. Launch Chrome/Chromium with remote debugging enabled on a dedicated profile:
   chromium \
     --remote-debugging-port=9222 \
     --user-data-dir="$HOME/.config/chromium-jarvis-ytmusic" \
     --no-first-run \
     --no-default-browser-check

2. Log into the Google account in that browser and open https://music.youtube.com

3. Expose the CDP port to the server with SSH reverse tunnel:
   ssh -N -R 9222:127.0.0.1:9222 <server-user>@<server-host>

4. On the server, Abel can then talk to the browser CDP endpoint at http://127.0.0.1:9222/json/version

### What this enables
- Read current track title / artist / album / queue from the real logged-in browser.
- Control playback via UI automation: play, pause, next, previous, search, pick track.
- Cast/transfer playback only if the session exposes device controls in the web UI.

## Limits
- True background playback control across arbitrary Google/YouTube Music devices is not exposed by a public supported API.
- If a target device is only visible in the mobile app cast picker and not in web UI, Abel may not be able to transfer playback from the server alone.

## Preferred alternatives
- Pair the Android phone as an OpenClaw node for direct app/device assistance.
- Keep a persistent remote-debugging browser on Alejo's machine for web control.
