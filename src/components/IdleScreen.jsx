import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSnow, Sun } from "lucide-react";
import { formatDateLong, formatTime12h } from "../lib/format";

const iconMap = {
  sun: Sun,
  cloud: Cloud,
  "cloud-fog": CloudFog,
  "cloud-drizzle": CloudDrizzle,
  "cloud-rain": CloudRain,
  "cloud-snow": CloudSnow,
  "cloud-lightning": CloudLightning,
};

// Idle view with time/date/weather and last played track.
const IdleScreen = ({ now, weather, previous, onClearToken }) => {
  const WeatherIcon = iconMap[weather?.icon] || Cloud;

  return (
    <div className="flex-1 px-12 py-12">
      <div className="flex h-full items-center justify-between">
        <div>
          <div className="text-6xl font-semibold text-white">
            {formatTime12h(now)}
          </div>
          <div className="mt-3 text-lg text-white/70">{formatDateLong(now)}</div>
        </div>

        <div className="text-right">
          <div className="flex items-center justify-end gap-3 text-white">
            <WeatherIcon className="h-8 w-8" />
            <span className="text-3xl font-semibold">
              {weather?.temperature != null ? `${Math.round(weather.temperature)}°C` : "--"}
            </span>
          </div>
          <div className="mt-2 text-sm text-white/70">
            {weather?.label || "Weather unavailable"} · {weather?.location || "Unknown"}
          </div>
        </div>
      </div>

      <div className="mt-12 flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 p-6">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-white/50">
            Last played
          </div>
          {previous ? (
            <div className="mt-2 text-lg text-white">
              {previous?.name} · {previous?.artists?.[0]?.name}
            </div>
          ) : (
            <div className="mt-2 text-white/40">No recent track.</div>
          )}
        </div>
        <button
          onClick={onClearToken}
          className="rounded-full border border-white/40 px-4 py-2 text-sm text-white/80 hover:border-white/70"
        >
          Clear token cache
        </button>
      </div>
    </div>
  );
};

export default IdleScreen;
