import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs/promises";
import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";

// Load environment variables for Spotify + app configuration.
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT || 3001);
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || "";
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || "";
const SPOTIFY_REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI || "";
const SPOTIFY_DEVICE_NAME = process.env.SPOTIFY_DEVICE_NAME || "";
const LOGS_ENABLED = (process.env.LOGS_ENABLED || "true") === "true";

const OPEN_METEO_POSTAL_CODE = process.env.OPEN_METEO_POSTAL_CODE || "";
const OPEN_METEO_COUNTRY = process.env.OPEN_METEO_COUNTRY || "CA";
const OPEN_METEO_CITY = process.env.OPEN_METEO_CITY || "";
const OPEN_METEO_LAT = process.env.OPEN_METEO_LAT || "";
const OPEN_METEO_LON = process.env.OPEN_METEO_LON || "";

const SPOTIFY_API = "https://api.spotify.com/v1";
const SPOTIFY_AUTH_URL = "https://accounts.spotify.com/authorize";
const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";
const TOKEN_PATH = path.join(__dirname, "token.json");

const SCOPES = [
  "streaming",
  "user-read-email",
  "user-read-private",
  "user-read-playback-state",
  "user-modify-playback-state",
  "user-read-currently-playing",
  "user-read-recently-played",
  "user-library-read",
  "user-library-modify",
  "playlist-read-private",
].join(" ");

app.use(
  cors({
    origin: CLIENT_URL,
    credentials: true,
  }),
);
app.use(express.json());

// Small logger wrapper so we can silence server logs with an env flag.
const log = (...args) => {
  if (LOGS_ENABLED) {
    console.log("[server]", ...args);
  }
};

const readTokenFile = async () => {
  try {
    const raw = await fs.readFile(TOKEN_PATH, "utf-8");
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
};

const writeTokenFile = async (data) => {
  await fs.writeFile(TOKEN_PATH, JSON.stringify(data, null, 2));
};

const isTokenExpired = (token) => {
  if (!token?.expires_at) return true;
  // Refresh slightly early to avoid edge timing.
  return Date.now() >= token.expires_at - 60_000;
};

const refreshAccessToken = async (refreshToken) => {
  const authHeader = Buffer.from(
    `${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`,
  ).toString("base64");

  const response = await fetch(SPOTIFY_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${authHeader}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Refresh token failed: ${response.status} ${errorBody}`);
  }

  const data = await response.json();
  const now = Date.now();

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token || refreshToken,
    expires_at: now + data.expires_in * 1000,
  };
};

const ensureAccessToken = async () => {
  const token = await readTokenFile();
  if (!token) return null;

  if (!isTokenExpired(token)) {
    return token.access_token;
  }

  const refreshed = await refreshAccessToken(token.refresh_token);
  await writeTokenFile(refreshed);
  return refreshed.access_token;
};

const spotifyFetch = async (endpoint, options = {}) => {
  const accessToken = await ensureAccessToken();
  if (!accessToken) {
    return { status: 401, data: { error: "Not authenticated" } };
  }

  const response = await fetch(`${SPOTIFY_API}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (response.status === 204) {
    return { status: 204, data: null };
  }

  const text = await response.text();
  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch (error) {
    data = { raw: text };
  }

  if (!response.ok) {
    log(`Spotify API error ${response.status} on ${endpoint}`, data);
  }

  return { status: response.status, data };
};

// --- Auth flow -------------------------------------------------------------
app.get("/login", (req, res) => {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: SPOTIFY_CLIENT_ID,
    scope: SCOPES,
    redirect_uri: SPOTIFY_REDIRECT_URI,
    state: crypto.randomUUID(),
  });

  res.redirect(`${SPOTIFY_AUTH_URL}?${params.toString()}`);
});

app.get("/callback", async (req, res) => {
  const code = req.query.code;
  if (!code) {
    return res.status(400).send("Missing Spotify code.");
  }

  try {
    const authHeader = Buffer.from(
      `${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`,
    ).toString("base64");

    const response = await fetch(SPOTIFY_TOKEN_URL, {
      method: "POST",
      headers: {
        Authorization: `Basic ${authHeader}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        grant_type: "authorization_code",
        redirect_uri: SPOTIFY_REDIRECT_URI,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Token exchange failed: ${response.status} ${errorBody}`);
    }

    const data = await response.json();
    const now = Date.now();
    await writeTokenFile({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: now + data.expires_in * 1000,
    });

    log("Spotify token stored.");
    return res.redirect(CLIENT_URL);
  } catch (error) {
    log("Callback error:", error.message);
    return res.status(500).send("Spotify authentication failed.");
  }
});

app.get("/status", async (req, res) => {
  const token = await readTokenFile();
  res.json({
    authenticated: Boolean(token?.access_token),
    expires_at: token?.expires_at || null,
  });
});

app.get("/token", async (req, res) => {
  try {
    const accessToken = await ensureAccessToken();
    if (!accessToken) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    return res.json({ access_token: accessToken });
  } catch (error) {
    log("Token error:", error.message);
    return res.status(500).json({ error: "Token fetch failed" });
  }
});

app.delete("/token", async (req, res) => {
  try {
    await fs.unlink(TOKEN_PATH);
    return res.json({ cleared: true });
  } catch (error) {
    return res.json({ cleared: false });
  }
});

// --- Spotify data ----------------------------------------------------------
app.get("/now-playing", async (req, res) => {
  const response = await spotifyFetch("/me/player/currently-playing");
  if (response.status === 204) {
    return res.json({ is_playing: false });
  }
  return res.status(response.status).json(response.data);
});

app.get("/player", async (req, res) => {
  const response = await spotifyFetch("/me/player");
  return res.status(response.status).json(response.data);
});

app.get("/queue", async (req, res) => {
  const response = await spotifyFetch("/me/player/queue");
  return res.status(response.status).json(response.data);
});

app.get("/recently-played", async (req, res) => {
  const response = await spotifyFetch("/me/player/recently-played?limit=1");
  return res.status(response.status).json(response.data);
});

app.get("/devices", async (req, res) => {
  const response = await spotifyFetch("/me/player/devices");
  if (response.status === 200) {
    log(
      "Devices:",
      response.data?.devices?.map((device) => ({
        id: device.id,
        name: device.name,
        is_active: device.is_active,
      })),
    );
  }
  return res.status(response.status).json(response.data);
});

app.put("/transfer", async (req, res) => {
  const { deviceId, deviceName } = req.body || {};
  const devicesResponse = await spotifyFetch("/me/player/devices");

  if (devicesResponse.status !== 200) {
    return res.status(devicesResponse.status).json(devicesResponse.data);
  }

  const devices = devicesResponse.data?.devices || [];
  const targetName = deviceName || SPOTIFY_DEVICE_NAME;
  const matchedById = devices.find((device) => device.id === deviceId);
  const matchedByName = devices.find(
    (device) =>
      device.name?.toLowerCase() === targetName?.toLowerCase() && targetName,
  );
  const activeDevice = devices.find((device) => device.is_active);
  const targetDevice = matchedById || matchedByName || activeDevice;

  if (!targetDevice?.id) {
    return res.status(404).json({ error: "No device available to transfer." });
  }

  const response = await spotifyFetch("/me/player", {
    method: "PUT",
    body: JSON.stringify({
      device_ids: [targetDevice.id],
      play: false,
    }),
  });

  return res.status(response.status).json({
    ...response.data,
    device: targetDevice,
  });
});

app.put("/play", async (req, res) => {
  const { deviceId } = req.body || {};
  const deviceParam = deviceId ? `?device_id=${encodeURIComponent(deviceId)}` : "";
  const response = await spotifyFetch(`/me/player/play${deviceParam}`, {
    method: "PUT",
  });
  return res.status(response.status).json(response.data);
});

app.put("/pause", async (req, res) => {
  const { deviceId } = req.body || {};
  const deviceParam = deviceId ? `?device_id=${encodeURIComponent(deviceId)}` : "";
  const response = await spotifyFetch(`/me/player/pause${deviceParam}`, {
    method: "PUT",
  });
  return res.status(response.status).json(response.data);
});

// Attempt to "wake" a device by transferring playback and then issuing play.
app.put("/wake", async (req, res) => {
  const { deviceId } = req.body || {};
  if (!deviceId) {
    return res.status(400).json({ error: "deviceId required" });
  }

  const transferResponse = await spotifyFetch("/me/player", {
    method: "PUT",
    body: JSON.stringify({
      device_ids: [deviceId],
      play: false,
    }),
  });

  if (!transferResponse || transferResponse.status >= 400) {
    return res.status(transferResponse.status).json(transferResponse.data);
  }

  const playResponse = await spotifyFetch(
    `/me/player/play?device_id=${encodeURIComponent(deviceId)}`,
    { method: "PUT" },
  );
  return res.status(playResponse.status).json(playResponse.data);
});

app.post("/next", async (req, res) => {
  const { deviceId } = req.body || {};
  const deviceParam = deviceId ? `?device_id=${encodeURIComponent(deviceId)}` : "";
  const response = await spotifyFetch(`/me/player/next${deviceParam}`, {
    method: "POST",
  });
  return res.status(response.status).json(response.data);
});

app.post("/previous", async (req, res) => {
  const { deviceId } = req.body || {};
  const deviceParam = deviceId ? `?device_id=${encodeURIComponent(deviceId)}` : "";
  const response = await spotifyFetch(`/me/player/previous${deviceParam}`, {
    method: "POST",
  });
  return res.status(response.status).json(response.data);
});

app.put("/seek", async (req, res) => {
  const { positionMs, deviceId } = req.body || {};
  const safePosition = Math.max(0, Number(positionMs || 0));
  const deviceParam = deviceId ? `&device_id=${encodeURIComponent(deviceId)}` : "";
  const response = await spotifyFetch(
    `/me/player/seek?position_ms=${safePosition}${deviceParam}`,
    {
      method: "PUT",
    },
  );
  return res.status(response.status).json(response.data);
});

app.put("/shuffle", async (req, res) => {
  const { state, deviceId } = req.body || {};
  const deviceParam = deviceId ? `&device_id=${encodeURIComponent(deviceId)}` : "";
  const response = await spotifyFetch(
    `/me/player/shuffle?state=${Boolean(state)}${deviceParam}`,
    {
      method: "PUT",
    },
  );
  return res.status(response.status).json(response.data);
});

app.put("/repeat", async (req, res) => {
  const { state, deviceId } = req.body || {};
  const mode = state || "off";
  const deviceParam = deviceId ? `&device_id=${encodeURIComponent(deviceId)}` : "";
  const response = await spotifyFetch(
    `/me/player/repeat?state=${mode}${deviceParam}`,
    {
      method: "PUT",
    },
  );
  return res.status(response.status).json(response.data);
});

app.put("/volume", async (req, res) => {
  const { volume, deviceId } = req.body || {};
  const safeVolume = Math.max(0, Math.min(100, Number(volume ?? 50)));
  const deviceParam = deviceId ? `&device_id=${encodeURIComponent(deviceId)}` : "";
  const response = await spotifyFetch(
    `/me/player/volume?volume_percent=${safeVolume}${deviceParam}`,
    {
      method: "PUT",
    },
  );
  return res.status(response.status).json(response.data);
});

app.get("/artist/:id", async (req, res) => {
  const response = await spotifyFetch(`/artists/${req.params.id}`);
  return res.status(response.status).json(response.data);
});

app.get("/me/tracks/contains", async (req, res) => {
  const ids = req.query.ids;
  if (!ids) {
    return res.status(400).json({ error: "ids query required" });
  }
  const response = await spotifyFetch(
    `/me/tracks/contains?ids=${encodeURIComponent(ids || "")}`,
  );
  return res.status(response.status).json(response.data);
});

app.put("/me/tracks", async (req, res) => {
  const { ids } = req.body || {};
  const response = await spotifyFetch(`/me/tracks?ids=${encodeURIComponent(ids || "")}`, {
    method: "PUT",
  });
  return res.status(response.status).json(response.data);
});

app.delete("/me/tracks", async (req, res) => {
  const { ids } = req.body || {};
  const response = await spotifyFetch(`/me/tracks?ids=${encodeURIComponent(ids || "")}`, {
    method: "DELETE",
  });
  return res.status(response.status).json(response.data);
});

// --- Weather (Open-Meteo) --------------------------------------------------
let weatherCache = {
  data: null,
  lastFetchedAt: 0,
};

const weatherCodeMap = (code, isDay) => {
  if ([0].includes(code)) return { label: "Clear", icon: isDay ? "sun" : "moon" };
  if ([1, 2, 3].includes(code)) return { label: "Cloudy", icon: "cloud" };
  if ([45, 48].includes(code)) return { label: "Fog", icon: "cloud-fog" };
  if ([51, 53, 55, 56, 57].includes(code))
    return { label: "Drizzle", icon: "cloud-drizzle" };
  if ([61, 63, 65, 80, 81, 82].includes(code))
    return { label: "Rain", icon: "cloud-rain" };
  if ([66, 67].includes(code)) return { label: "Freezing Rain", icon: "cloud-rain" };
  if ([71, 73, 75, 77, 85, 86].includes(code))
    return { label: "Snow", icon: "cloud-snow" };
  if ([95, 96, 99].includes(code))
    return { label: "Thunder", icon: "cloud-lightning" };
  return { label: "Unknown", icon: "cloud" };
};

app.get("/weather", async (req, res) => {
  const thirtyMinutes = 30 * 60 * 1000;
  const now = Date.now();

  if (weatherCache.data && now - weatherCache.lastFetchedAt < thirtyMinutes) {
    return res.json(weatherCache.data);
  }

  try {
    let latitude = Number(OPEN_METEO_LAT);
    let longitude = Number(OPEN_METEO_LON);
    let locationLabel = "Toronto";
    let isDay = true;

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      const geoResponse = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
          OPEN_METEO_POSTAL_CODE,
        )}&count=1&language=en&format=json&country=${OPEN_METEO_COUNTRY}`,
      );
      const geoData = await geoResponse.json();
      const location = geoData?.results?.[0];

      if (!location) {
        return res.status(404).json({ error: "Postal code not found." });
      }

      latitude = location.latitude;
      longitude = location.longitude;
      locationLabel = "Toronto";
    } else {
      const reverseResponse = await fetch(
        `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${latitude}&longitude=${longitude}&count=1&language=en&format=json`,
      );
      const reverseData = await reverseResponse.json();
      locationLabel = "Toronto";
    }

    const forecastResponse = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,is_day&temperature_unit=celsius`,
    );
    const forecastData = await forecastResponse.json();
    const current = forecastData?.current;
    isDay = current?.is_day === 1;
    const condition = weatherCodeMap(current?.weather_code, isDay);

    const payload = {
      temperature: current?.temperature_2m ?? null,
      weather_code: current?.weather_code ?? null,
      is_day: current?.is_day ?? null,
      label: condition.label,
      icon: condition.icon,
      location: locationLabel,
      last_updated: now,
    };

    weatherCache = { data: payload, lastFetchedAt: now };
    return res.json(payload);
  } catch (error) {
    log("Weather error:", error.message);
    return res.status(500).json({ error: "Weather lookup failed." });
  }
});

// --- Fallback --------------------------------------------------------------
app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.listen(PORT, () => {
  log(`Server running on http://127.0.0.1:${PORT}`);
});
