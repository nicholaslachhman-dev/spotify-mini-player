import { Home, Monitor, Music2, ListMusic } from "lucide-react";

// Bottom navigation bar shared across screens.
const NavBar = ({
  activeScreen,
  onNavigate,
  onToggleFullscreen,
  currentTimeLabel,
  deviceName,
}) => {
  const buttonClass = (screen) =>
    `flex h-10 w-10 items-center justify-center rounded-full border ${
      activeScreen === screen
        ? "border-white/60 bg-white/10 text-white"
        : "border-white/20 text-white/60 hover:text-white"
    }`;

  return (
    <div className="flex items-center justify-between border-t border-white/10 bg-black/30 px-6 py-3">
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
        <button className={buttonClass("fullscreen")} onClick={onToggleFullscreen}>
          <Monitor className="h-5 w-5" />
        </button>
      </div>

      <div className="text-lrg text-white/70">{currentTimeLabel}</div>

      <div className="text-sm text-white/70">
        {deviceName ? `${deviceName}` : "No device"}
      </div>
    </div>
  );
};

export default NavBar;
