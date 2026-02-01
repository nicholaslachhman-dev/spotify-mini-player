import { useEffect, useState } from "react";
import {
  CirclePlus,
  Pause,
  Play,
  Repeat,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
} from "lucide-react";
import { formatMs } from "../lib/format";

// Player layout based on the mockup: album art, track info/controls, queue, and footer info.
const PlayerScreen = ({
  nowPlaying,
  queue,
  previous,
  artist,
  controls,
}) => {
  const track = nowPlaying?.item || null;
  const isPlaying = Boolean(nowPlaying?.is_playing);
  const durationMs = track?.duration_ms || 0;
  const [progressMs, setProgressMs] = useState(nowPlaying?.progress_ms || 0);
  const volume = nowPlaying?.device?.volume_percent ?? 50;
  const remainingMs = Math.max(0, durationMs - progressMs);
  const shuffleState = nowPlaying?.shuffle_state || false;
  const repeatState = nowPlaying?.repeat_state || "off";

  useEffect(() => {
    setProgressMs(nowPlaying?.progress_ms || 0);
  }, [nowPlaying?.progress_ms]);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setProgressMs((prev) => Math.min(prev + 1000, durationMs));
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying, durationMs]);

  const progressPercent = durationMs
    ? Math.min(100, (progressMs / durationMs) * 100)
    : 0;

  const releaseYear = track?.album?.release_date?.slice(0, 4);
  const genre = artist?.genres?.[0];
  const popularity = track?.popularity;

  const upNext = queue?.queue?.slice(0, 3) || [];

  return (
    <div className="flex-1">
      <div className="grid h-full grid-cols-3 gap-10 px-12 py-20">
        {/* Album Art Section */}
        <section className="flex items-center justify-centers px-10">
          <div className="relative">
            {track?.album?.images?.[0]?.url ? (
              <img
                src={track.album.images[0].url}
                alt={track?.name || "Album art"}
                className="h-[420px] w-[420px] object-cover shadow-2xl"
              />
            ) : (
              <div className="flex h-[420px] w-[420px] items-center justify-center border border-white/10 bg-black/20 text-white/40">
                No album art
              </div>
            )}
            <div className="absolute inset-0 bg-black/10" />
          </div>
        </section>

        {/* Player Section */}
        <section className="flex flex-col justify-center gap-6 px-10">
          <div>
            <h1 className="text-5xl font-semibold leading-tight text-white">
              {track?.name || "Nothing playing"}
            </h1>
            <p className="mt-2 text-2xl text-white/70">
              {track?.artists?.map((artistItem) => artistItem.name).join(", ")}
            </p>
            <p className="text-xl text-white/50">{track?.album?.name}</p>
            <p className="text-base text-white/50">{releaseYear}</p>
          </div>

          {/* <div className="flex flex-wrap gap-3 text-sm text-white/70">
            {releaseYear && <span>{releaseYear}</span>}
            {genre && <span>Genre: {genre}</span>}
            {typeof popularity === "number" && (
              <span>Popularity: {popularity}</span>
            )}
          </div> */}

          <div>
            <div className="flex items-center justify-between text-xs text-white/60">
              <span>{formatMs(progressMs)}</span>
              <span>-{formatMs(remainingMs)}</span>
            </div>
            <div className="relative mt-2 h-1 rounded-full bg-white/20">
              <div
                className="absolute h-1 rounded-full bg-white"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-center gap-6 text-white">
            <button onClick={() => controls.shuffle(!shuffleState)}>
              <Shuffle className={`h-6 w-6 ${shuffleState ? "text-white" : "text-white/60"}`} />
            </button>
            <button onClick={controls.previous}>
              <SkipBack className="h-8 w-8" />
            </button>
            <button
              className="flex h-16 w-16 items-center justify-center rounded-full border border-white/50"
              onClick={isPlaying ? controls.pause : controls.play}
            >
              {isPlaying ? (
                <Pause className="h-8 w-8" />
              ) : (
                <Play className="h-8 w-8" />
              )}
            </button>
            <button onClick={controls.next}>
              <SkipForward className="h-8 w-8" />
            </button>
            <button onClick={() => controls.repeat(repeatState === "off" ? "context" : "off")}>
              <Repeat className={`h-6 w-6 ${repeatState !== "off" ? "text-white" : "text-white/60"}`} />
            </button>
            <button>
              <CirclePlus className="h-8 w-8" />
            </button>
          </div>

          <div className="flex items-center justify-center gap-3 pt-5">
            <Volume2 className="h-4 w-4 text-white/70" />
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={(event) => controls.volume(event.target.value)}
              className="h-1 w-48 accent-white"
            />
          </div>
        </section>
        
        {/* Playlist Section */}
        <section className="flex flex-col justify-center gap-6 px-10">
          <div>
            <h2 className="text-sm uppercase tracking-[0.2em] text-white/60">
              Up next
            </h2>
            <div className="mt-4 space-y-4">
              {upNext.length === 0 && (
                <p className="text-sm text-white/40">No upcoming tracks.</p>
              )}
              {upNext.map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  <img
                    src={item?.album?.images?.[2]?.url}
                    alt={item?.name}
                    className="h-16 w-16 object-cover"
                  />
                  <div>
                    <p className="text-base text-white">{item?.name}</p>
                    <p className="text-base text-white/60">
                      {item?.artists?.map((artistItem) => artistItem.name).join(", ")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-sm uppercase tracking-[0.2em] text-white/60">
              Previously played
            </h2>
            <div className="mt-4">
              {previous ? (
                <div className="flex items-center gap-3">
                  <img
                    src={previous?.album?.images?.[2]?.url}
                    alt={previous?.name}
                    className="h-16 w-16 object-cover"
                  />
                  <div>
                    <p className="text-base text-white">{previous?.name}</p>
                    <p className="text-base text-white/60">
                      {previous?.artists?.map((artistItem) => artistItem.name).join(", ")}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-white/40">No previous track.</p>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default PlayerScreen;
