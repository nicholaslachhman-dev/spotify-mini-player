import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost, apiPut } from "../lib/api";
import { useInterval } from "./useInterval";
import { useLogs } from "../context/LogContext";

const POLL_MS = 5000;

// Centralized Spotify data polling + playback controls.
export const useSpotify = () => {
  const [status, setStatus] = useState({ authenticated: false });
  const [nowPlaying, setNowPlaying] = useState(null);
  const [queue, setQueue] = useState(null);
  const [previous, setPrevious] = useState(null);
  const [artist, setArtist] = useState(null);
  const [devices, setDevices] = useState([]);
  const { addLog } = useLogs();

  const refreshStatus = async () => {
    const response = await apiGet("/status");
    if (response.status === 200) {
      setStatus(response.data);
    }
  };

  const fetchNowPlaying = async () => {
    const response = await apiGet("/now-playing");
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

  const transferToDefaultDevice = async () => {
    await apiPut("/transfer");
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
    const trackId = nowPlaying?.item?.id;
    const trackType = nowPlaying?.item?.type;
    const artistId = nowPlaying?.item?.artists?.[0]?.id;
    setArtist(null);
    fetchTrackDetails(trackId, artistId, trackType);
  }, [nowPlaying?.item?.id, nowPlaying?.item?.artists]);

  const controls = useMemo(
    () => ({
      play: () => apiPut("/play"),
      pause: () => apiPut("/pause"),
      next: () => apiPost("/next"),
      previous: () => apiPost("/previous"),
      shuffle: (state) => apiPut("/shuffle", { state }),
      repeat: (state) => apiPut("/repeat", { state }),
      volume: (value) => apiPut("/volume", { volume: value }),
    }),
    [],
  );

  return {
    status,
    nowPlaying,
    queue,
    previous,
    artist,
    devices,
    refreshStatus,
    fetchDevices,
    controls,
  };
};
