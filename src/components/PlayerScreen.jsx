import { useEffect, useRef, useState } from "react";
import {
  CirclePlus,
  CircleCheck,
  EyeOff,
  Pause,
  Play,
  Repeat,
  Shuffle,
  SkipBack,
  SkipForward,
} from "lucide-react";
import { formatMs } from "../lib/format";

// Player layout based on the mockup: album art, track info/controls, queue, and footer info.
const PlayerScreen = ({
  nowPlaying,
  queue,
  previous,
  artist,
  controls,
  targetDeviceId,
  isTrackLiked,
  likedMap,
  playlistName,
}) => {
  const track = nowPlaying?.item || null;
  const isPlaying = Boolean(nowPlaying?.is_playing);
  const durationMs = track?.duration_ms || 0;
  const [progressMs, setProgressMs] = useState(nowPlaying?.progress_ms || 0);
  const [isArtHidden, setIsArtHidden] = useState(false);
  const [currentArt, setCurrentArt] = useState(
    track?.album?.images?.[0]?.url || null,
  );
  const [nextArt, setNextArt] = useState(null);
  const [nextOpacity, setNextOpacity] = useState(0);
  const artFadeTimerRef = useRef(null);
  const artPreloadRef = useRef(null);
  const lastArtRef = useRef(track?.album?.images?.[0]?.url || null);
  const remainingMs = Math.max(0, durationMs - progressMs);
  const shuffleState = nowPlaying?.shuffle_state || false;
  const repeatState = nowPlaying?.repeat_state || "off";
  const deviceId = targetDeviceId || nowPlaying?.device?.id;

  useEffect(() => {
    setProgressMs(nowPlaying?.progress_ms || 0);
  }, [nowPlaying?.progress_ms]);

  useEffect(() => {
    const nextArt = track?.album?.images?.[0]?.url || null;
    if (!nextArt || nextArt === lastArtRef.current) return;
    lastArtRef.current = nextArt;

    if (artFadeTimerRef.current) {
      clearTimeout(artFadeTimerRef.current);
    }

    const img = new Image();
    artPreloadRef.current = img;
    img.src = nextArt;
    img.onload = () => {
      if (artPreloadRef.current !== img) return;
      setNextArt(nextArt);
      setNextOpacity(0);
      requestAnimationFrame(() => {
        setNextOpacity(1);
      });
      artFadeTimerRef.current = setTimeout(() => {
        setCurrentArt(nextArt);
        setNextArt(null);
        setNextOpacity(0);
      }, 1000);
    };
  }, [track?.id]);

  useEffect(() => {
    return () => {
      if (artFadeTimerRef.current) {
        clearTimeout(artFadeTimerRef.current);
      }
    };
  }, []);

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

  const handleSeek = (event) => {
    if (!durationMs) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const ratio = Math.min(1, Math.max(0, clickX / rect.width));
    const nextPosition = Math.round(durationMs * ratio);
    setProgressMs(nextPosition);
    controls.seek(nextPosition, deviceId);
  };

  return (
    <div className="flex h-full w-full items-center overflow-hidden">
      <div className="grid w-full grid-cols-3 gap-10 px-12 py-6">
        {/* Album Art Section */}
        <section className="flex items-center justify-center px-24">
          <div className="relative w-full">
            {currentArt ? (
              <button
                type="button"
                onClick={() => setIsArtHidden((prev) => !prev)}
                className="relative block w-full aspect-square overflow-hidden shadow-2xl"
                aria-pressed={isArtHidden}
                aria-label="Toggle album art visibility"
              >
                <img
                  src={currentArt}
                  alt={track?.name || "Album art"}
                  className={`absolute inset-0 h-full w-full object-cover transition duration-[700ms] ease-in-out ${
                    isArtHidden ? "blur-md" : ""
                  }`}
                />
                {nextArt && (
                  <img
                    src={nextArt}
                    alt={track?.name || "Next album art"}
                  className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[1000ms] ease-in-out ${
                    isArtHidden ? "blur-md" : ""
                  }`}
                    style={{
                      opacity: nextOpacity,
                    }}
                  />
                )}
                {isArtHidden && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <EyeOff className="h-14 w-14 text-white/890" />
                  </div>
                )}
                //<div className="absolute inset-0 bg-black/10" />
              </button>
            ) : (
              <div className="flex w-full aspect-square items-center justify-center border border-white/10 bg-black/20 text-white/40">
                No album art
              </div>
            )}
          </div>
        </section>

        {/* Player Section */}
        <section className="flex flex-col justify-center gap-4 px-6">
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
          
          <div className="flex justify-end">
            <button onClick={() => controls.toggleLike(track?.id)} className="like-btn">
              {isTrackLiked ? (
                <CircleCheck className="like-icon h-8 w-8 text-[#1DB954]" />
              ) : (
                <CirclePlus className="like-icon h-8 w-8" />
              )}
            </button>
          </div>
          
          <div>
            <div className="flex items-center justify-between text-xs text-white/60">
              <span>{formatMs(progressMs)}</span>
              <span>-{formatMs(remainingMs)}</span>
            </div>
            <div
              className="seek-bar relative mt-2 h-1 cursor-pointer rounded-full bg-white/20"
              onClick={handleSeek}
            >
              <div
                className="seek-fill absolute h-1 rounded-full bg-white"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-center gap-8 py-2 text-white">
            <button onClick={() => controls.shuffle(!shuffleState, deviceId)} className="control-btn">
              <Shuffle className={`control-icon h-6 w-6 ${shuffleState ? "text-white" : "text-white/60"}`} />
            </button>
            <button onClick={() => controls.previous(deviceId)} className="control-btn">
              <SkipBack className="control-icon h-8 w-8" />
            </button>
            <button
              className="primary-btn flex h-20 w-20 items-center justify-center rounded-full border-4 border-white/50"
              onClick={() =>
                isPlaying ? controls.pause(deviceId) : controls.play(deviceId)
              }
            >
              {isPlaying ? (
                <Pause className="primary-icon h-8 w-8" />
              ) : (
                <Play className="primary-icon h-8 w-8" />
              )}
            </button>
            <button onClick={() => controls.next(deviceId)} className="control-btn">
              <SkipForward className="control-icon h-8 w-8" />
            </button>
            <button
              onClick={() =>
                controls.repeat(
                  repeatState === "off" ? "context" : "off",
                  deviceId,
                )
              }
              className="control-btn"
            >
              <Repeat className={`control-icon h-6 w-6 ${repeatState !== "off" ? "text-white" : "text-white/60"}`} />
            </button>
          </div>

        </section>
        
        {/* Playlist Section */}
        <section className="flex flex-col justify-center gap-4 px-16">
          <div>
            <h2 className="text-sm uppercase tracking-[0.2em] text-white/60">
              Up next
            </h2>
            <div className="mt-1 text-sm text-white/50">
              {playlistName || "no playlist"}
            </div>
            <div className="mt-4 space-y-4">
              {upNext.length === 0 && (
                <p className="text-sm text-white/40">No upcoming tracks.</p>
              )}
              {upNext.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
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
                  {likedMap?.[item?.id] && (
                    <CircleCheck className="h-5 w-5 text-[#1DB954]" />
                  )}
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
                <div className="flex items-center justify-between gap-3">
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
                  {likedMap?.[previous?.id] && (
                    <CircleCheck className="h-5 w-5 text-[#1DB954]" />
                  )}
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
