# Spotify server-side control

Control path: persistent authenticated Chromium session on the server via direct CDP.

## Main script

`/home/acabarcas/.openclaw/workspace/tools/ytmusic/spotify_cdp.js`

## Design notes

- Uses the authenticated Spotify web session already logged into the persistent Chromium profile on the server.
- Uses direct CDP instead of the OpenClaw browser wrapper because Spotify UI automation was more stable this way in this environment.
- Includes a local lock file so commands do not step on each other.
- Lock path defaults to: `/home/acabarcas/.openclaw/workspace/tools/ytmusic/.spotify_cdp.lock`

## Commands

### Current status
```bash
node /home/acabarcas/.openclaw/workspace/tools/ytmusic/spotify_cdp.js status
```

### Open a specific track page by track id
```bash
node /home/acabarcas/.openclaw/workspace/tools/ytmusic/spotify_cdp.js open-track <trackId>
```

### Open and play a specific track by track id
```bash
node /home/acabarcas/.openclaw/workspace/tools/ytmusic/spotify_cdp.js play-track <trackId>
```

### Search
```bash
node /home/acabarcas/.openclaw/workspace/tools/ytmusic/spotify_cdp.js search "query"
```

### Search and play by title
```bash
node /home/acabarcas/.openclaw/workspace/tools/ytmusic/spotify_cdp.js play-title "Los Malaventurados No Lloran"
```

### Search and play by exact title match
```bash
node /home/acabarcas/.openclaw/workspace/tools/ytmusic/spotify_cdp.js play-title-exact "Los Malaventurados No Lloran"
```

### Basic controls
```bash
node /home/acabarcas/.openclaw/workspace/tools/ytmusic/spotify_cdp.js pause
node /home/acabarcas/.openclaw/workspace/tools/ytmusic/spotify_cdp.js resume
node /home/acabarcas/.openclaw/workspace/tools/ytmusic/spotify_cdp.js next
node /home/acabarcas/.openclaw/workspace/tools/ytmusic/spotify_cdp.js previous
```

### Device list
```bash
node /home/acabarcas/.openclaw/workspace/tools/ytmusic/spotify_cdp.js device-list
```

## End-to-end test script

`/home/acabarcas/.openclaw/workspace/tools/ytmusic/spotify_e2e.sh`

Runs a sequential smoke test:
- status
- play-title-exact
- pause
- resume
- next
- previous
- status

## What is confirmed working

Confirmed in live testing on 2026-04-17:
- `play-title-exact` can select the exact studio version of `Los Malaventurados No Lloran` by PXNDX.
- `pause` works using the stable Spotify control-bar button test id `control-button-playpause`.
- `resume` works using the same control-bar button.
- `next` works using `control-button-skip-forward`.
- `status` can report current track/title/artist/play-state from the active Spotify web session.

## Known caveats

- `previous` fires the correct Spotify control-bar button (`control-button-skip-back`), but the effect can depend on current queue/history state inside Spotify.
- `device-list` still needs one more hardening pass.
- Search result pages can show text unrelated to the actual now-playing item; status should be interpreted as the active playback state, not just central-page text.

## Related files

- Main control script: `/home/acabarcas/.openclaw/workspace/tools/ytmusic/spotify_cdp.js`
- E2E smoke test: `/home/acabarcas/.openclaw/workspace/tools/ytmusic/spotify_e2e.sh`
- Debug helpers:
  - `/home/acabarcas/.openclaw/workspace/tools/ytmusic/spotify_cdp_debug.js`
  - `/home/acabarcas/.openclaw/workspace/tools/ytmusic/spotify_buttons_dump.js`
