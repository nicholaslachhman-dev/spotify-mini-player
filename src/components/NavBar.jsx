import {
  Home,
  Monitor,
  Music2,
  ListMusic,
  Smartphone,
  Unplug,
  TerminalSquare,
  Volume2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

// Bottom navigation bar shared across screens.
const NavBar = ({
  navRef,
  activeScreen,
  onNavigate,
  onToggleFullscreen,
  onToggleLogs,
  currentTimeLabel,
  isDefaultDeviceAvailable,
  defaultDeviceLabel,
  playbackTarget,
  onPlaybackTargetChange,
  webPlaybackReady,
  isMiniPlayerActive,
  isIphoneActive,
  activeDeviceName,
  devices,
  onDeviceSelect,
  supportsVolume,
  volumePercent,
  onVolumeChange,
}) => {
  const [localVolume, setLocalVolume] = useState(volumePercent ?? 50);
  const sendTimerRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const buttonClass = (screen) =>
    `flex h-10 w-10 items-center justify-center rounded-full border ${
      activeScreen === screen
        ? "border-white/60 bg-white/10 text-white"
        : "border-white/20 text-white/60 hover:text-white"
    }`;

  const toggleClass = (target) =>
    `flex items-center gap-2 rounded-full border px-3 py-1 text-sm ${
      playbackTarget === target
        ? "border-white/60 bg-white/10 text-white"
        : "border-white/20 text-white/60 hover:text-white"
    }`;

  useEffect(() => {
    const handleClick = (event) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener("mousedown", handleClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleClick);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!supportsVolume) return;
    setLocalVolume(volumePercent ?? 50);
  }, [supportsVolume, volumePercent]);

  const scheduleVolumeSend = (nextValue) => {
    if (sendTimerRef.current) {
      clearTimeout(sendTimerRef.current);
    }
    sendTimerRef.current = setTimeout(() => {
      onVolumeChange?.(nextValue);
    }, 200);
  };

  return (
    <div
      ref={navRef}
      className="flex items-center justify-between border-t border-white/10 bg-black/30 px-6 py-3"
    >
      <div className="flex items-center gap-3">
        <button
          className={buttonClass("idle")}
          onClick={() => onNavigate("idle")}
        >
          <Home className="h-5 w-5" />
        </button>
        <button
          className={buttonClass("player")}
          onClick={() => onNavigate("player")}
        >
          <Music2 className="h-5 w-5" />
        </button>
        <button
          className={buttonClass("playlist")}
          onClick={() => onNavigate("playlist")}
        >
          <ListMusic className="h-5 w-5" />
        </button>
        <button
          type="button"
          className={buttonClass("logs")}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onToggleLogs?.();
          }}
        >
          <TerminalSquare className="h-5 w-5" />
        </button>
        <button className={buttonClass("fullscreen")} onClick={onToggleFullscreen}>
          <Monitor className="h-5 w-5" />
        </button>
      </div>

      <div className="flex items-center gap-4">
        {/* <button
          className={toggleClass("this")}
          onClick={() => onPlaybackTargetChange("this")}
          disabled={!webPlaybackReady}
          title={
            webPlaybackReady
              ? "Play on this device (Web Playback SDK)"
              : "Web Playback SDK not ready"
          }
        >
          <Monitor className="h-4 w-4" />
          This device
        </button>
        <button
          className={toggleClass("iphone")}
          onClick={() => onPlaybackTargetChange("iphone")}
          title={`${defaultDeviceLabel} (Spotify Connect)`}
        >
          <Smartphone className="h-4 w-4" />
          iPhone
        </button> */}
        <div className="text-2xl text-white/70">{currentTimeLabel}</div>
      </div>

      <div className="flex items-center gap-4">
        {supportsVolume && (
          <div className="flex items-center gap-2">
            <Volume2 className="h-4 w-4 text-white/60" />
            <input
              type="range"
              min="0"
              max="100"
              value={localVolume}
              onChange={(event) => {
                const nextValue = Number(event.target.value);
                setLocalVolume(nextValue);
                scheduleVolumeSend(nextValue);
              }}
              className="h-1 w-24 accent-white"
            />
          </div>
        )}
        <div className="relative" ref={menuRef}>
        <button
          className="flex items-center gap-2 text-base"
          onClick={() => setMenuOpen((prev) => !prev)}
          title="Select playback device"
        >
          {activeDeviceName ? (
            <>
              {isMiniPlayerActive ? (
                <Monitor className="h-5 w-5 text-[#1DB954]" />
              ) : (
                <Smartphone className="h-5 w-5 text-[#1DB954]" />
              )}
              <span className="text-[#1DB954]">{activeDeviceName}</span>
            </>
          ) : (
            <>
              <Unplug className="h-5 w-5 text-gray-500" />
              <span className="text-gray-500">No active device</span>
            </>
          )}
        </button>

        {menuOpen && (
          <div className="absolute right-0 bottom-10 z-[999] w-64 rounded-xl border border-white/15 bg-black/90 p-2 text-sm shadow-2xl">
            <div className="px-3 py-2 text-xs uppercase tracking-[0.2em] text-white/50">
              Available devices
            </div>
            <div className="max-h-64 overflow-auto">
              {(() => {
                const miniDeviceName = "Mini Player";
                const miniDevice = webPlaybackReady
                  ? {
                      id: "web-playback",
                      name: miniDeviceName,
                      is_active: playbackTarget === "this",
                      isMiniPlayer: true,
                    }
                  : null;
                const filteredDevices = devices?.filter(
                  (device) =>
                    device?.name?.toLowerCase() !== miniDeviceName.toLowerCase(),
                );
                const list = miniDevice ? [miniDevice, ...(filteredDevices || [])] : filteredDevices;

                return list?.length ? (
                  list.map((device) => {
                  const isActive = device.name === activeDeviceName;
                  const isMini = device.isMiniPlayer === true;
                  return (
                    <button
                      key={device.id}
                      onClick={() => {
                        onDeviceSelect?.(device);
                        setMenuOpen(false);
                      }}
                      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left ${
                        isActive
                          ? "text-[#1DB954]"
                          : "text-white/80 hover:bg-white/5"
                      }`}
                    >
                      {isMini ? (
                        <Monitor className={`h-4 w-4 ${isActive ? "text-[#1DB954]" : "text-white/80"}`} />
                      ) : (
                        <Smartphone className={`h-4 w-4 ${isActive ? "text-[#1DB954]" : "text-white/80"}`} />
                      )}
                      <span>{device.name}</span>
                    </button>
                  );
                })
                ) : (
                  <div className="px-3 py-2 text-white/50">No devices found.</div>
                );
              })()}
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default NavBar;
