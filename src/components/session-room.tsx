import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Id } from "@/convex/_generated/dataModel";
import {
  useSessionPlayback,
  type SessionSong,
} from "@/hooks/use-session-playback";
import { formatDuration } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  LogOut,
  Music2,
  Pause,
  Play,
  Search,
  Square,
  Users,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { Wordmark } from "@/components/wordmark";

function MemberBlock({
  name,
  role,
  present,
}: {
  name: string;
  role: string;
  present: boolean;
}) {
  return (
    <div className="flex items-center gap-3 py-4">
      <Avatar className="size-9 rounded-full border border-border">
        <AvatarFallback className="rounded-full bg-muted text-sm font-medium">
          {name.charAt(0).toUpperCase() || "?"}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{name}</p>
        <p className="text-xs text-muted-foreground">
          {role}
          {present ? " · in session" : " · not here yet"}
        </p>
      </div>
    </div>
  );
}

export function SessionRoom({
  sessionId,
  code,
  host,
  guest,
  songs,
  isHost,
  onLeave,
  onEnd,
}: {
  sessionId: Id<"sessions">;
  code: string;
  host: { name: string; image: string | null };
  guest: { name: string; image: string | null } | null;
  songs: SessionSong[];
  isHost: boolean;
  onLeave: () => void;
  onEnd: () => void;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [userActivated, setUserActivated] = useState(false);
  const [scrub, setScrub] = useState<number | null>(null);
  const [query, setQuery] = useState("");

  const filteredSongs = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return songs;
    return songs.filter(
      (song) =>
        song.title.toLowerCase().includes(q) ||
        (song.artist ?? "").toLowerCase().includes(q),
    );
  }, [songs, query]);

  const {
    playback,
    isPlaying,
    positionMs,
    durationMs,
    isBuffering,
    needsActivation,
    activate,
    pickSong,
    togglePlay,
    seek,
  } = useSessionPlayback({
    sessionId,
    songs,
    isHost,
    audioRef,
    userActivated,
    onActivate: () => setUserActivated(true),
  });

  const currentSong = playback?.songId
    ? songs.find((s) => s._id === playback.songId)
    : undefined;

  const shownPosition = scrub ?? positionMs;
  const shownDuration = durationMs || currentSong?.durationMs || 0;
  const progress = shownDuration > 0 ? shownPosition / shownDuration : 0;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <audio ref={audioRef} preload="auto" className="hidden" />

      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-6">
          <Link to="/dashboard" aria-label="Back to dashboard">
            <Wordmark />
          </Link>
          <div className="flex items-center gap-4">
            <span className="hidden font-mono text-xs tracking-[0.2em] text-muted-foreground sm:inline">
              {code}
            </span>
            {isHost ? (
              <Button variant="outline" size="sm" onClick={onEnd}>
                <Square className="size-3.5" />
                End session
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={onLeave}>
                <LogOut className="size-3.5" />
                Leave
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12">
        {/* Members */}
        <section className="border-b border-border">
          <div className="grid grid-cols-1 divide-y divide-border sm:grid-cols-2 sm:divide-x sm:divide-y-0">
            <MemberBlock name={host.name} role="Host" present />
            <MemberBlock
              name={guest?.name ?? "Waiting for a friend…"}
              role="Guest"
              present={guest !== null}
            />
          </div>
        </section>

        {/* Player */}
        <section className="border-b border-border pb-12 pt-12">
          {currentSong ? (
            <div className="flex flex-col gap-8">
              <div className="flex flex-col gap-1">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                  Now playing
                </p>
                <h2 className="mt-2 text-2xl font-medium tracking-tight sm:text-3xl">
                  {currentSong.title}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {currentSong.artist || "Untitled artist"} · from{" "}
                  {currentSong.uploaderName}&apos;s library
                </p>
              </div>

              <div className="flex items-center gap-5">
                {isHost ? (
                  <Button
                    size="icon-lg"
                    className="rounded-full"
                    onClick={togglePlay}
                    aria-label={isPlaying ? "Pause" : "Play"}
                  >
                    {isBuffering ? (
                      <span className="size-4 animate-pulse rounded-full border border-current" />
                    ) : isPlaying ? (
                      <Pause className="size-5" />
                    ) : (
                      <Play className="size-5 translate-x-px" />
                    )}
                  </Button>
                ) : needsActivation ? (
                  <Button
                    size="icon-lg"
                    className="rounded-full"
                    onClick={activate}
                    aria-label="Tap to listen"
                  >
                    <Play className="size-5 translate-x-px" />
                  </Button>
                ) : (
                  <Button
                    size="icon-lg"
                    variant="outline"
                    className="pointer-events-none rounded-full"
                    aria-label="Host controls playback"
                  >
                    {isBuffering ? (
                      <span className="size-4 animate-pulse rounded-full border border-current" />
                    ) : isPlaying ? (
                      <Pause className="size-5" />
                    ) : (
                      <Play className="size-5 translate-x-px" />
                    )}
                  </Button>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-4 text-xs tabular-nums text-muted-foreground">
                    <span>{formatDuration(shownPosition)}</span>
                    <span>{formatDuration(shownDuration)}</span>
                  </div>
                  <div className="mt-2">
                    {isHost ? (
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
                        onValueCommit={(values) => {
                          seek(values[0]);
                          setScrub(null);
                        }}
                        className="cursor-pointer"
                      />
                    ) : (
                      <div
                        className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
                        aria-hidden="true"
                      >
                        <div
                          className="h-full rounded-full bg-primary transition-[width] duration-300"
                          style={{
                            width: `${Math.min(Math.max(progress * 100, 0), 100)}%`,
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                {isHost ? (
                  <>
                    You&apos;re driving tonight — play, pause and seek are yours.
                    Your friend hears it in sync.
                  </>
                ) : needsActivation ? (
                  <>Tap play above to start following {host.name} in sync.</>
                ) : (
                  <>
                    Following {host.name} in sync — they drive playback. You
                    can still pick the next song.
                  </>
                )}
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-start gap-3 py-6">
              <div className="flex size-11 items-center justify-center rounded-full border border-border">
                <Music2 className="size-5 text-muted-foreground" />
              </div>
              <div>
                <h2 className="text-xl font-medium tracking-tight">
                  Nothing playing yet
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {songs.length > 0
                    ? isHost
                      ? "Pick a song from the library below to start."
                      : "Waiting for someone to pick a song — both of you can."
                    : "Neither library has songs yet. Upload a track from your dashboard first."}
                </p>
              </div>
            </div>
          )}
        </section>

        {/* Library */}
        <section className="pt-12">
          <div className="flex items-baseline justify-between">
            <h3 className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              Library
            </h3>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Users className="size-3.5" />
              {host.name} + {guest?.name ?? "friend"}
            </p>
          </div>

          {songs.length === 0 ? (
            <div className="mt-6 rounded-lg border border-dashed border-border px-6 py-14 text-center">
              <p className="text-sm text-muted-foreground">
                No songs yet. Upload audio from your dashboard and it will
                appear here for both of you.
              </p>
            </div>
          ) : (
            <>
              <div className="relative mt-4">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search the shared catalog…"
                  aria-label="Search the shared library"
                  className="h-10 w-full rounded-md border border-border bg-background pl-9 pr-4 text-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-ring focus:ring-[3px] focus:ring-ring/40"
                />
              </div>

              {filteredSongs.length > 0 ? (
                <ul className="mt-4 divide-y divide-border">
                  {filteredSongs.map((song) => {
                    const isCurrent = playback?.songId === song._id;
                    return (
                      <li key={song._id}>
                        <button
                          type="button"
                          onClick={() => pickSong(song._id)}
                          className={cn(
                            "group flex w-full items-center gap-4 px-1 py-3.5 text-left transition-colors",
                            "hover:bg-muted/40 focus-visible:outline-none",
                          )}
                        >
                          <span
                            className={cn(
                              "flex size-9 shrink-0 items-center justify-center rounded-full border",
                              isCurrent
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border text-muted-foreground group-hover:border-primary/40 group-hover:text-primary",
                            )}
                          >
                            {isCurrent && isPlaying ? (
                              <Pause className="size-3.5" />
                            ) : (
                              <Play className="size-3.5 translate-x-px" />
                            )}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span
                              className={cn(
                                "block truncate text-sm",
                                isCurrent ? "font-medium" : "font-normal",
                              )}
                            >
                              {song.title}
                            </span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {song.artist || "Untitled artist"} ·{" "}
                              {song.uploaderName}
                            </span>
                          </span>
                          <span className="text-xs tabular-nums text-muted-foreground">
                            {formatDuration(song.durationMs)}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="mt-4 rounded-lg border border-dashed border-border px-6 py-14 text-center">
                  <p className="text-sm text-muted-foreground">
                    No matches for “{query.trim()}” in the shared library.
                  </p>
                </div>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}