import { useCallback, useEffect, useMemo, useState } from "react";
import Background from "./components/Background";
import PlayerScreen from "./components/PlayerScreen";
import IdleScreen from "./components/IdleScreen";
import PlaylistScreen from "./components/PlaylistScreen";
import NavBar from "./components/NavBar";
import LogPanel from "./components/LogPanel";
import { useIdleTimer } from "./hooks/useIdleTimer";
import { useSpotify } from "./hooks/useSpotify";
import { useWebPlayback } from "./hooks/useWebPlayback";
import { useWeather } from "./hooks/useWeather";
import { useLogs } from "./context/LogContext";
import { apiDelete, apiPut } from "./lib/api";

const IDLE_TIMEOUT_MS = Number(import.meta.env.VITE_IDLE_TIMEOUT_MS || 60000);
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:3001";

const App = () => {
  const [activeScreen, setActiveScreen] = useState("player");
  const [playbackTarget, setPlaybackTarget] = useState("iphone");
  const [now, setNow] = useState(new Date());
  const { toggleVisibility, addLog } = useLogs();
  const webPlayback = useWebPlayback();
  const {
    status,
    nowPlaying,
    queue,
    previous,
    artist,
    controls,
    defaultDeviceId,
    resolvedTargetDeviceId,
    devices,
  } = useSpotify({
    playbackTarget,
    targetDeviceId: webPlayback.deviceId,
  });
  const weather = useWeather();

  useIdleTimer({
    timeoutMs: IDLE_TIMEOUT_MS,
    onIdle: () => setActiveScreen("idle"),
  });

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen();
    }
  }, []);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "F11") {
        event.preventDefault();
        toggleFullscreen();
      }
      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "l") {
        toggleVisibility();
        addLog("Toggled log panel (Ctrl + Shift + L).");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggleFullscreen, toggleVisibility, addLog]);

  const clearToken = async () => {
    await apiDelete("/token");
    addLog("Token cache cleared.");
  };

  const defaultDeviceLabel =
    import.meta.env.VITE_DEFAULT_DEVICE_NAME || "Default device";
  const activeDeviceName = nowPlaying?.device?.name || null;
  const isDefaultDeviceAvailable =
    Boolean(defaultDeviceId) ||
    activeDeviceName?.toLowerCase() === defaultDeviceLabel.toLowerCase();
  const isMiniPlayerActive =
    activeDeviceName?.toLowerCase() === "mini player";
  const isIphoneActive =
    activeDeviceName?.toLowerCase() === defaultDeviceLabel.toLowerCase();

  useEffect(() => {
    const transfer = async () => {
      if (playbackTarget === "this" && webPlayback.deviceId) {
        await apiPut("/transfer", { deviceId: webPlayback.deviceId });
      }
      if (playbackTarget === "iphone" && defaultDeviceId) {
        await apiPut("/transfer", { deviceId: defaultDeviceId });
      }
    };
    transfer();
  }, [playbackTarget, webPlayback.deviceId, defaultDeviceId]);

  const handleDeviceSelect = async (device) => {
    if (!device?.id) return;
    const isMiniPlayer = device.isMiniPlayer === true;
    setPlaybackTarget(isMiniPlayer ? "this" : "iphone");
    await apiPut("/transfer", { deviceId: device.id });
  };

  const screen = useMemo(() => {
    if (activeScreen === "idle") {
      return (
        <IdleScreen
          now={now}
          weather={weather}
          previous={previous}
          onClearToken={clearToken}
        />
      );
    }

    if (activeScreen === "playlist") {
      return <PlaylistScreen />;
    }

    return (
      <PlayerScreen
        nowPlaying={nowPlaying}
        queue={queue}
        previous={previous}
        artist={artist}
        controls={controls}
        targetDeviceId={resolvedTargetDeviceId}
      />
    );
  }, [activeScreen, now, weather, previous, nowPlaying, queue, artist, controls]);

  if (!status.authenticated) {
    return (
      <div className="relative min-h-screen overflow-hidden">
        <Background />
        <div className="relative z-10 flex min-h-screen items-center justify-center">
          <div className="rounded-2xl border border-white/20 bg-black/40 p-8 text-center">
            <h1 className="text-2xl font-semibold text-white">Connect Spotify</h1>
            <p className="mt-2 text-sm text-white/70">
              Authenticate once to enable playback controls.
            </p>
            <a
              href={`${API_BASE}/login`}
              className="mt-6 inline-flex rounded-full border border-white/40 px-6 py-3 text-sm text-white/90 hover:border-white/80"
            >
              Login with Spotify
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <Background imageUrl={nowPlaying?.item?.album?.images?.[0]?.url} />
      <div className="relative z-10 flex min-h-screen flex-col">
        <div key={activeScreen} className="flex-1 transition-opacity duration-500">
          {screen}
        </div>
        <NavBar
          activeScreen={activeScreen}
          onNavigate={setActiveScreen}
          onToggleFullscreen={toggleFullscreen}
          onToggleLogs={toggleVisibility}
          currentTimeLabel={now.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
          })}
          isDefaultDeviceAvailable={isDefaultDeviceAvailable}
          defaultDeviceLabel={defaultDeviceLabel}
          playbackTarget={playbackTarget}
          onPlaybackTargetChange={setPlaybackTarget}
          webPlaybackReady={Boolean(webPlayback.deviceId)}
          isMiniPlayerActive={isMiniPlayerActive}
          isIphoneActive={isIphoneActive}
          activeDeviceName={activeDeviceName}
          devices={devices}
          onDeviceSelect={handleDeviceSelect}
        />
      </div>
      <LogPanel />
    </div>
  );
};

export default App;
