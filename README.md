# Spotify Mini Player (Remix)

A lightweight Spotify mini player built with React, Tailwind CSS, and a small Node server. It displays the current track, playback controls, queue, and an idle screen with time/date/weather.

## Features
- React + Vite frontend with Tailwind CSS styling
- Node server for Spotify OAuth, token refresh, and proxying Spotify API calls
- Auto-refresh Spotify tokens to avoid timeout
- Auto-transfer playback to `Nicholas's iPhone` (fallback to active device)
- Player, Idle, and Playlist (placeholder) screens with bottom navigation
- Web Playback SDK mode to play directly in this app (always-available Connect device)
- Idle screen shows time (12-hour with seconds), date, and Open-Meteo weather
- Device dropdown to select the active playback device
- Playlist label above Up Next (shows playlist name when available)
- Click-to-seek on the progress bar
- Like/unlike current track with the Circle icon
- Log panel with draggable/resizable window and Nav Bar toggle
- Keyboard shortcut to toggle logs: `Ctrl + Shift + L`
- Nav Bar clear token cache button
- Album art blur toggle with EyeOff and crossfade transitions
- Background crossfade transitions
- Frameless + Electron-ready setup (packaging later)

## Tech / Libraries
- React, Vite
- Tailwind CSS
- Express + CORS
- Lucide icons
- Open-Meteo (no key required)
- Nodemon + concurrently (dev tooling)
- Spotify Web Playback SDK

## Setup
1) Copy the env template and fill in your values:
```
copy .env.example .env
```

2) Update values in `.env`:
- `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET`
- `SPOTIFY_REDIRECT_URI` set to `http://127.0.0.1:3001/callback`
- `SPOTIFY_DEVICE_NAME` set to `Nicholas's iPhone`
- `OPEN_METEO_LAT` and `OPEN_METEO_LON` set to `43.64` and `-79.38`
- `VITE_PAUSE_TO_IDLE_MS` set to `10000` for testing (e.g., 60000 for 60s)

3) Install deps:
```
npm install
```

4) Start both server and client:
```
npm run dev
```

5) Open the app and click **Login with Spotify**.
6) If you used the app before, clear the token cache and re-login so new scopes apply.

## Notes
- The local server runs on `http://127.0.0.1:3001`.
- Vite dev server runs on `http://localhost:5173`.
- Token cache is stored in `server/token.json` and can be cleared from the Idle screen.
- Web Playback SDK requires Spotify Premium and updated scopes (re-login).
- Volume slider shows only when the active device supports volume control.
- Weather label is currently hard-coded to Toronto.
- Auto-switch to Idle after playback is paused/stopped for the configured duration.
- Spotify-curated playlist names may be unavailable (API can return 404).

## Versions
- 0.2.3: Added playlist label, seek bar hover/controls, and nav bar token clear.
- 0.2.2: Added like/unlike, click-to-seek, album art/background transitions, and weather fixes.
- 0.2.1: Added device dropdown, log panel controls, and volume slider improvements.
- 0.2.0: Added Web Playback SDK mode and playback target toggle.
- 0.1.1: Removed BPM/audio features to avoid Spotify 403.
- 0.1.0: Initial scaffold with Spotify auth, player layout, and idle screen.
