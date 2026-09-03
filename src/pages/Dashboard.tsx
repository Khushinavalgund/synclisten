import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { SoloPlayerBar } from "@/components/solo-player";
import { UploadDialog } from "@/components/upload-dialog";
import { Wordmark } from "@/components/wordmark";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/hooks/use-auth";
import { formatDuration } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowRight,
  KeyRound,
  Link2,
  Loader2,
  LogOut,
  Music2,
  Pause,
  Play,
  Search,
  Upload,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router";

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const mySongs = useQuery(api.songs.listMine);
  const mySession = useQuery(api.sessions.getMySession);
  const createSession = useMutation(api.sessions.create);

  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [joinCode, setJoinCode] = useState("");

  // Solo playback state.
  const [soloSongId, setSoloSongId] = useState<Id<"songs"> | null>(null);

  const handlePlaySolo = useCallback((songId: Id<"songs"> | null) => {
    setSoloSongId(songId);
  }, []);

  const soloSong = useMemo(() => {
    if (!soloSongId || !mySongs) return null;
    return mySongs.find((s) => s._id === soloSongId) ?? null;
  }, [soloSongId, mySongs]);

  const filteredSongs = useMemo(() => {
    if (!mySongs) return mySongs;
    const q = query.trim().toLowerCase();
    if (!q) return mySongs;
    return mySongs.filter(
      (song) =>
        song.title.toLowerCase().includes(q) ||
        (song.artist ?? "").toLowerCase().includes(q),
    );
  }, [mySongs, query]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const handleCreateSession = async () => {
    setIsCreating(true);
    setCreateError(null);
    try {
      const { code } = await createSession();
      navigate(`/session/${code}`);
    } catch (error) {
      setCreateError(
        error instanceof Error
          ? error.message
          : "Could not start a session.",
      );
      setIsCreating(false);
    }
  };

  const handleJoinByCode = (event: React.FormEvent) => {
    event.preventDefault();
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    navigate(`/session/${code}`);
  };

  return (
    <main className="min-h-screen bg-background pb-28 text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-6">
          <Wordmark />
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {user?.name ?? user?.email ?? "You"}
            </span>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="size-4" />
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-4xl flex-col gap-16 px-6 py-12">
        {/* Sessions */}
        <section aria-label="Sessions">
          <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Sessions
          </h2>

          {mySession ? (
            <div className="mt-4 flex flex-col gap-4 rounded-lg border border-border p-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex size-10 items-center justify-center rounded-full border border-border">
                  <Link2 className="size-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">
                    Session{" "}
                    <span className="font-mono tracking-widest">
                      {mySession.session.code}
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {mySession.myRole === "host" ? "You're the host" : "Guest"}
                    {" · "}
                    {mySession.session.status === "waiting"
                      ? "waiting for your friend"
                      : "both of you are in"}
                  </p>
                </div>
              </div>
              <Button
                className="self-start sm:self-auto"
                onClick={() =>
                  navigate(`/session/${mySession.session.code}`)
                }
              >
                Open session
                <ArrowRight className="size-4" />
              </Button>
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
              {/* Start a session */}
              <div className="rounded-lg border border-border p-8">
                <h3 className="text-xl font-medium tracking-tight">
                  Start a session
                </h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Play together with one friend — you host, they join, and both
                  of you hear the same song at the same moment.
                </p>
                {createError && (
                  <p className="mt-3 text-sm text-destructive">{createError}</p>
                )}
                <Button
                  className="mt-6"
                  onClick={handleCreateSession}
                  disabled={isCreating}
                >
                  {isCreating ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Play className="size-4" />
                  )}
                  Start a session
                </Button>
              </div>

              {/* Join with a code */}
              <div className="rounded-lg border border-border p-8">
                <h3 className="text-xl font-medium tracking-tight">
                  Join with a code
                </h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Got an invite code from a friend? Enter it here and hop
                  straight into their session.
                </p>
                <form onSubmit={handleJoinByCode} className="mt-6 flex gap-2">
                  <input
                    type="text"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                    placeholder="K7M2QX"
                    maxLength={6}
                    aria-label="Session code"
                    className="h-10 min-w-0 flex-1 rounded-md border border-border bg-background px-3 font-mono text-sm uppercase tracking-[0.2em] outline-none transition-colors placeholder:normal-case placeholder:tracking-normal placeholder:text-muted-foreground/70 focus:border-ring focus:ring-[3px] focus:ring-ring/40"
                  />
                  <Button type="submit" variant="outline">
                    <KeyRound className="size-4" />
                    Join
                  </Button>
                </form>
              </div>
            </div>
          )}
        </section>

        {/* Library */}
        <section aria-label="Your library">
          <div className="flex items-baseline justify-between">
            <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              Your library
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setUploadOpen(true)}
            >
              <Upload className="size-4" />
              Upload
            </Button>
          </div>

          {mySongs === undefined ? (
            <div className="mt-4 flex items-center justify-center py-16">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : mySongs.length === 0 ? (
            <Empty className="mt-4">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Music2 />
                </EmptyMedia>
                <EmptyTitle>Your library is a blank canvas</EmptyTitle>
                <EmptyDescription>
                  Add your own songs — any format, any length. Play them solo,
                  or share them in a session.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button onClick={() => setUploadOpen(true)}>
                  <Upload className="size-4" />
                  Upload your first song
                </Button>
              </EmptyContent>
            </Empty>
          ) : (
            <>
              <div className="relative mt-4">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search your catalog…"
                  aria-label="Search your library"
                  className="h-10 w-full rounded-md border border-border bg-background pl-9 pr-4 text-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-ring focus:ring-[3px] focus:ring-ring/40"
                />
              </div>

              {filteredSongs && filteredSongs.length > 0 ? (
                <ul className="mt-4 divide-y divide-border">
                  {filteredSongs.map((song) => {
                    const isSoloCurrent = soloSongId === song._id;
                    return (
                      <li key={song._id}>
                        <button
                          type="button"
                          onClick={() => handlePlaySolo(song._id)}
                          aria-label={`Play ${song.title}`}
                          className={cn(
                            "group flex w-full items-center gap-4 px-1 py-3.5 text-left transition-colors",
                            "hover:bg-muted/40 focus-visible:outline-none",
                          )}
                        >
                          <span className="w-6 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                            {mySongs.length -
                              mySongs.findIndex((s) => s._id === song._id)}
                          </span>
                          <span
                            className={cn(
                              "flex size-9 shrink-0 items-center justify-center rounded-full border",
                              isSoloCurrent
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border text-muted-foreground group-hover:border-primary/40 group-hover:text-primary",
                            )}
                          >
                            {isSoloCurrent ? (
                              <Pause className="size-3.5" />
                            ) : (
                              <Play className="size-3.5 translate-x-px" />
                            )}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm">
                              {song.title}
                            </span>
                            {song.artist && (
                              <span className="block truncate text-xs text-muted-foreground">
                                {song.artist}
                              </span>
                            )}
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
                    No matches for “{query.trim()}”. Try another title or
                    artist.
                  </p>
                </div>
              )}

              <p className="mt-4 text-xs text-muted-foreground">
                Tap any song to play it solo — or start a session to listen
                together.
              </p>
            </>
          )}
        </section>
      </div>

      {/* Solo player */}
      {soloSong && mySongs && (
        <SoloPlayerBar
          song={soloSong}
          songs={mySongs}
          onSongChange={handlePlaySolo}
          onClose={() => handlePlaySolo(null)}
        />
      )}

      <UploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
      />
    </main>
  );
}