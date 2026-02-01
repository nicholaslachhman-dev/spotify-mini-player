import { useEffect, useMemo, useRef, useState } from "react";
import { apiGet, apiPost, apiPut } from "../lib/api";
import { useInterval } from "./useInterval";
import { useLogs } from "../context/LogContext";

const POLL_MS = 5000;
const DEFAULT_DEVICE_NAME =
  import.meta.env.VITE_DEFAULT_DEVICE_NAME || "Nicholas's iPhone";

// Centralized Spotify data polling + playback controls.
export const useSpotify = ({ playbackTarget = "iphone", targetDeviceId = null } = {}) => {
  const [status, setStatus] = useState({ authenticated: false });
  const [nowPlaying, setNowPlaying] = useState(null);
  const [queue, setQueue] = useState(null);
  const [previous, setPrevious] = useState(null);
  const [artist, setArtist] = useState(null);
  const [devices, setDevices] = useState([]);
  const { addLog } = useLogs();
  const lastTransferRef = useRef(0);

  const refreshStatus = async () => {
    const response = await apiGet("/status");
    if (response.status === 200) {
      setStatus(response.data);
    }
  };

  const fetchNowPlaying = async () => {
    const response = await apiGet("/player");
    if (response.status === 200) {
      setNowPlaying(response.data);
    }
  };

  const fetchQueue = async () => {
    const response = await apiGet("/queue");
    if (response.status === 200) {
      setQueue(response.data);
    }
  };

  const fetchPrevious = async () => {
    const response = await apiGet("/recently-played");
    if (response.status === 200) {
      setPrevious(response.data?.items?.[0]?.track || null);
    }
  };

  const fetchDevices = async () => {
    const response = await apiGet("/devices");
    if (response.status === 200) {
      setDevices(response.data?.devices || []);
      addLog("Device list refreshed (check server console).");
    }
  };

  const transferToDefaultDevice = async (deviceId) => {
    await apiPut("/transfer", deviceId ? { deviceId } : undefined);
  };

  const fetchTrackDetails = async (trackId, artistId, trackType) => {
    if (!trackId || trackType !== "track") return;
    if (!artistId) return;
    const artistResponse = await apiGet(`/artist/${artistId}`);
    if (artistResponse?.status === 200) {
      setArtist(artistResponse.data);
    }
  };

  useEffect(() => {
    refreshStatus();
    fetchDevices();
    transferToDefaultDevice();
  }, []);

  useInterval(fetchNowPlaying, POLL_MS);
  useInterval(fetchQueue, POLL_MS);
  useInterval(fetchPrevious, 15_000);
  // Device list is fetched once on load to avoid constant polling.
  useInterval(refreshStatus, 60_000);

  useEffect(() => {
    if (playbackTarget !== "iphone") return;
    if (!DEFAULT_DEVICE_NAME || devices.length === 0) return;
    const activeDeviceId = nowPlaying?.device?.id;
    const activeDeviceName = nowPlaying?.device?.name;
    const target = devices.find(
      (device) =>
        device.name?.toLowerCase() === DEFAULT_DEVICE_NAME.toLowerCase(),
    );

    if (!target?.id) return;
    if (activeDeviceId === target.id) return;

    // Avoid spamming transfers; only re-assert every 30s if needed.
    const now = Date.now();
    if (now - lastTransferRef.current < 30_000) return;
    lastTransferRef.current = now;

    addLog(
      `Transferring playback to default device: ${target.name} (was ${activeDeviceName || "unknown"}).`,
    );
    transferToDefaultDevice(target.id);
  }, [
    playbackTarget,
    devices,
    nowPlaying?.device?.id,
    nowPlaying?.device?.name,
    addLog,
  ]);

  useEffect(() => {
    const trackId = nowPlaying?.item?.id;
    const trackType = nowPlaying?.item?.type;
    const artistId = nowPlaying?.item?.artists?.[0]?.id;
    setArtist(null);
    fetchTrackDetails(trackId, artistId, trackType);
  }, [nowPlaying?.item?.id, nowPlaying?.item?.artists]);

  const defaultDeviceId = useMemo(() => {
    const target = devices.find(
      (device) =>
        device.name?.toLowerCase() === DEFAULT_DEVICE_NAME.toLowerCase(),
    );
    return target?.id || null;
  }, [devices]);

  const resolvedTargetDeviceId = useMemo(() => {
    if (playbackTarget === "this") {
      return targetDeviceId || null;
    }
    return defaultDeviceId || null;
  }, [playbackTarget, targetDeviceId, defaultDeviceId]);

  const controls = useMemo(
    () => ({
      play: async (deviceId) => {
        const targetId = deviceId || resolvedTargetDeviceId;
        const response = await apiPut(
          "/play",
          targetId ? { deviceId: targetId } : undefined,
        );
        if (
          response?.status === 404 &&
          response?.data?.error?.reason === "NO_ACTIVE_DEVICE" &&
          targetId
        ) {
          addLog("No active device. Attempting wake sequence...");
          return apiPut("/wake", { deviceId: targetId });
        }
        return response;
      },
      pause: (deviceId) => {
        const targetId = deviceId || resolvedTargetDeviceId;
        return apiPut("/pause", targetId ? { deviceId: targetId } : undefined);
      },
      next: (deviceId) => {
        const targetId = deviceId || resolvedTargetDeviceId;
        return apiPost("/next", targetId ? { deviceId: targetId } : undefined);
      },
      previous: (deviceId) => {
        const targetId = deviceId || resolvedTargetDeviceId;
        return apiPost("/previous", targetId ? { deviceId: targetId } : undefined);
      },
      shuffle: (state, deviceId) =>
        apiPut("/shuffle", {
          state,
          deviceId: deviceId || resolvedTargetDeviceId,
        }),
      repeat: (state, deviceId) =>
        apiPut("/repeat", {
          state,
          deviceId: deviceId || resolvedTargetDeviceId,
        }),
      volume: (value, deviceId) => apiPut("/volume", { volume: value, deviceId }),
    }),
    [resolvedTargetDeviceId],
  );

  return {
    status,
    nowPlaying,
    queue,
    previous,
    artist,
    devices,
    defaultDeviceId,
    resolvedTargetDeviceId,
    refreshStatus,
    fetchDevices,
    controls,
  };
};
