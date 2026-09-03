import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { UploadDialog } from "@/components/upload-dialog";
import { Wordmark } from "@/components/wordmark";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { formatDuration } from "@/lib/format";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowRight,
  Link2,
  Loader2,
  LogOut,
  Music2,
  Play,
  Search,
  Upload,
} from "lucide-react";
import { useMemo, useState } from "react";
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

  return (
    <main className="min-h-screen bg-background text-foreground">
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
        {/* Session */}
        <section aria-label="Session">
          <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Session
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
            <div className="mt-4 rounded-lg border border-border p-8">
              <h3 className="text-xl font-medium tracking-tight">
                Listen together
              </h3>
              <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                Start a two-person session, share the invite link, and both of
                you hear the same song at the same moment.
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
                  Add your own songs — any format, any length. They become
                  playable in the sessions you share.
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
                  {filteredSongs.map((song) => (
                    <li
                      key={song._id}
                      className="flex items-center gap-4 px-1 py-3.5"
                    >
                      <span className="w-6 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                        {mySongs.length - mySongs.findIndex((s) => s._id === song._id)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm">{song.title}</span>
                        {song.artist && (
                          <span className="block truncate text-xs text-muted-foreground">
                            {song.artist}
                          </span>
                        )}
                      </span>
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {formatDuration(song.durationMs)}
                      </span>
                    </li>
                  ))}
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
                Songs come alive in sessions — start one above to listen
                together.
              </p>
            </>
          )}
        </section>
      </div>

      <UploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
      />
    </main>
  );
}