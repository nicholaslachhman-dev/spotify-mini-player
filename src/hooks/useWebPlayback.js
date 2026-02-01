import { useEffect, useRef, useState } from "react";
import { apiGet } from "../lib/api";
import { useLogs } from "../context/LogContext";

const SDK_URL = "https://sdk.scdn.co/spotify-player.js";

// Initializes Spotify Web Playback SDK and exposes the device id.
export const useWebPlayback = () => {
  const [deviceId, setDeviceId] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const playerRef = useRef(null);
  const { addLog } = useLogs();

  useEffect(() => {
    if (window.Spotify) {
      setIsReady(true);
      return;
    }

    const script = document.createElement("script");
    script.src = SDK_URL;
    script.async = true;
    document.body.appendChild(script);

    window.onSpotifyWebPlaybackSDKReady = () => {
      setIsReady(true);
    };

    return () => {
      script.remove();
    };
  }, []);

  useEffect(() => {
    if (!isReady || playerRef.current) return;

    const player = new window.Spotify.Player({
      name: "Mini Player",
      getOAuthToken: async (cb) => {
        const response = await apiGet("/token");
        cb(response.data?.access_token || "");
      },
      volume: 0.8,
    });

    player.addListener("ready", ({ device_id }) => {
      addLog(`Web Playback SDK ready: ${device_id}`);
      setDeviceId(device_id);
    });

    player.addListener("not_ready", ({ device_id }) => {
      addLog(`Web Playback SDK not ready: ${device_id}`);
      if (deviceId === device_id) {
        setDeviceId(null);
      }
    });

    player.addListener("initialization_error", ({ message }) => {
      addLog(`SDK init error: ${message}`);
    });

    player.addListener("authentication_error", ({ message }) => {
      addLog(`SDK auth error: ${message}`);
    });

    player.addListener("account_error", ({ message }) => {
      addLog(`SDK account error: ${message}`);
    });

    player.connect();
    playerRef.current = player;

    return () => {
      player.disconnect();
    };
  }, [isReady, addLog, deviceId]);

  return { deviceId, isReady, player: playerRef.current };
};
