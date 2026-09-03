import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import type { Id } from "@/convex/_generated/dataModel";
import { formatDuration } from "@/lib/format";
import { Pause, Play, SkipForward, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export interface SoloSong {
  _id: Id<"songs">;
  title: string;
  artist?: string;
  durationMs?: number;
  url: string | null;
}

export function SoloPlayerBar({
  song,
  songs,
  onSongChange,
  onClose,
}: {
  song: SoloSong;
  songs: SoloSong[];
  onSongChange: (songId: Id<"songs"> | null) => void;
  onClose: () => void;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState(song.durationMs ?? 0);
  const [scrub, setScrub] = useState<number | null>(null);

  // Load and play whenever the selected song changes.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.src = song.url ?? "";
    audio.load();
    setPositionMs(0);
    setDurationMs(song.durationMs ?? 0);
    setIsPlaying(true);
    audio.play().catch(() => setIsPlaying(false));
  }, [song._id, song.url, song.durationMs]);

  // Element events.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setPositionMs(audio.currentTime * 1000);
    const onLoadedMetadata = () => {
      const d = audio.duration * 1000;
      if (isFinite(d)) setDurationMs(d);
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => {
      const index = songs.findIndex((s) => s._id === song._id);
      const next = songs[index + 1];
      if (next) onSongChange(next._id);
      else setPositionMs(0);
    };
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
    };
  }, [song, songs, onSongChange]);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  };

  const next = () => {
    const index = songs.findIndex((s) => s._id === song._id);
    const nxt = songs[index + 1];
    if (nxt) onSongChange(nxt._id);
  };

  const shownPosition = scrub ?? positionMs;
  const shownDuration = durationMs || song.durationMs || 0;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-20 max-w-4xl items-center gap-3 px-6">
        <div className="min-w-0 flex-1 sm:w-56 sm:flex-none">
          <p className="truncate text-sm font-medium">{song.title}</p>
          <p className="truncate text-xs text-muted-foreground">
            {song.artist || "Solo listening"}
          </p>
        </div>

        <Button
          variant="outline"
          size="icon"
          className="shrink-0 rounded-full"
          onClick={toggle}
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <Pause className="size-4" />
          ) : (
            <Play className="size-4 translate-x-px" />
          )}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 rounded-full"
          onClick={next}
          aria-label="Next song"
        >
          <SkipForward className="size-4" />
        </Button>

        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="hidden w-10 shrink-0 text-right text-xs tabular-nums text-muted-foreground sm:block">
            {formatDuration(shownPosition)}
          </span>
          <Slider
            value={[Math.min(shownPosition, shownDuration || 1)]}
            max={Math.max(shownDuration, 1)}
            step={1}
            onValueChange={(values) => {
              setScrub(values[0]);
              if (audioRef.current) {
                audioRef.current.currentTime = values[0] / 1000;
              }
            }}
            onValueCommit={() => setScrub(null)}
            className="cursor-pointer"
          />
          <span className="hidden w-10 shrink-0 text-xs tabular-nums text-muted-foreground sm:block">
            {formatDuration(shownDuration)}
          </span>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="shrink-0"
          onClick={onClose}
          aria-label="Stop listening"
        >
          <X className="size-4" />
        </Button>
      </div>
      <audio ref={audioRef} preload="auto" className="hidden" />
    </div>
  );
}