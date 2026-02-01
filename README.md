# Spotify Mini Player (Remix)

A lightweight Spotify mini player built with React, Tailwind CSS, and a small Node server. It displays the current track, playback controls, queue, and an idle screen with time/date/weather.

## Features
- React + Vite frontend with Tailwind CSS styling
- Node server for Spotify OAuth, token refresh, and proxying Spotify API calls
- Auto-refresh Spotify tokens to avoid timeout
- Auto-transfer playback to `Nicholas's iPhone` (fallback to active device)
- Player, Idle, and Playlist (placeholder) screens with bottom navigation
- Idle screen shows time (12-hour with seconds), date, and Open-Meteo weather
- Keyboard shortcut to toggle logs: `Ctrl + Shift + L`
- Frameless + Electron-ready setup (packaging later)

## Tech / Libraries
- React, Vite
- Tailwind CSS
- Express + CORS
- Lucide icons
- Open-Meteo (no key required)
- Nodemon + concurrently (dev tooling)

## Setup
1) Copy the env template and fill in your values:
```
copy .env.example .env
```

2) Update values in `.env`:
- `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET`
- `SPOTIFY_REDIRECT_URI` set to `http://127.0.0.1:8888/callback`
- `SPOTIFY_DEVICE_NAME` set to `Nicholas's iPhone`
- `OPEN_METEO_POSTAL_CODE` set to `M5J 2M4`

3) Install deps:
```
npm install
```

4) Start both server and client:
```
npm run dev
```

5) Open the app and click **Login with Spotify**.

## Notes
- The local server runs on `http://127.0.0.1:3001`.
- Vite dev server runs on `http://localhost:5173`.
- Token cache is stored in `server/token.json` and can be cleared from the Idle screen.

## Versions
- 0.1.1: Removed BPM/audio features to avoid Spotify 403.
- 0.1.0: Initial scaffold with Spotify auth, player layout, and idle screen.
