import { useEffect, useMemo, useRef, useState } from "react";
import { apiDelete, apiGet, apiPost, apiPut } from "../lib/api";
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
  const [isTrackLiked, setIsTrackLiked] = useState(false);
  const [likedMap, setLikedMap] = useState({});
  const [playlistName, setPlaylistName] = useState(null);
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

  const fetchLikedStatus = async (trackId, trackType) => {
    if (!trackId || trackType !== "track") {
      setIsTrackLiked(false);
      return;
    }
    const response = await apiGet(`/me/tracks/contains?ids=${trackId}`);
    if (response.status === 200 && Array.isArray(response.data)) {
      setIsTrackLiked(Boolean(response.data[0]));
      return;
    }
    setIsTrackLiked(false);
  };

  const fetchLikedMap = async (trackIds) => {
    const ids = (trackIds || []).filter(Boolean);
    if (ids.length === 0) {
      setLikedMap({});
      return;
    }

    const response = await apiGet(`/me/tracks/contains?ids=${ids.join(",")}`);
    if (response.status === 200 && Array.isArray(response.data)) {
      const nextMap = {};
      ids.forEach((id, index) => {
        nextMap[id] = Boolean(response.data[index]);
      });
      setLikedMap(nextMap);
    } else {
      setLikedMap({});
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
    fetchLikedStatus(trackId, trackType);
  }, [nowPlaying?.item?.id, nowPlaying?.item?.artists]);

  useEffect(() => {
    const resolvePlaylistName = async () => {
      const context = nowPlaying?.context;
      const contextUri = context?.uri || "";
      const isCollectionContext =
        context?.type === "collection" ||
        contextUri.startsWith("spotify:collection:");
      const isPlaylistContext =
        context?.type === "playlist" || contextUri.includes("spotify:playlist:");

      if (isCollectionContext) {
        setPlaylistName("Liked Songs");
        return;
      }

      if (!context || !contextUri || !isPlaylistContext) {
        setPlaylistName(null);
        return;
      }

      const playlistId = contextUri.split(":").pop();
      if (!playlistId) {
        setPlaylistName(null);
        return;
      }

      const response = await apiGet(`/playlist/${playlistId}`);
      if (response.status === 200) {
        setPlaylistName(response.data?.name || null);
        return;
      }

      // Fallback: search the user's playlists for a matching id (covers some edge cases).
      const playlistsResponse = await apiGet("/me/playlists?limit=50");
      if (playlistsResponse.status === 200) {
        const match = playlistsResponse.data?.items?.find(
          (item) => item?.id === playlistId,
        );
        setPlaylistName(match?.name || "Spotify Playlist");
        return;
      }

      setPlaylistName("Spotify Playlist");
    };

    resolvePlaylistName();
  }, [nowPlaying?.context?.uri, nowPlaying?.context?.type]);

  useEffect(() => {
    const upNextIds = (queue?.queue || []).slice(0, 3).map((item) => item?.id);
    const previousId = previous?.id ? [previous.id] : [];
    const ids = [...upNextIds, ...previousId];
    fetchLikedMap(ids);
  }, [queue, previous]);

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
      seek: (positionMs, deviceId) =>
        apiPut("/seek", {
          positionMs,
          deviceId: deviceId || resolvedTargetDeviceId,
        }),
      toggleLike: async (trackId) => {
        if (!trackId) return;
        if (isTrackLiked) {
          await apiDelete("/me/tracks", { ids: trackId });
          setIsTrackLiked(false);
        } else {
          await apiPut("/me/tracks", { ids: trackId });
          setIsTrackLiked(true);
        }
      },
    }),
    [resolvedTargetDeviceId, isTrackLiked],
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
    isTrackLiked,
    likedMap,
    playlistName,
    refreshStatus,
    fetchDevices,
    controls,
  };
};
