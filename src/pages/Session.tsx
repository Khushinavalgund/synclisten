import { Button } from "@/components/ui/button";
import { SessionRoom } from "@/components/session-room";
import { Wordmark } from "@/components/wordmark";
import { api } from "@/convex/_generated/api";
import { sessionLink } from "@/lib/format";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  Link2,
  Loader2,
  LogOut,
  Square,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";

export default function SessionPage() {
  const { code = "" } = useParams();
  const navigate = useNavigate();

  const data = useQuery(api.sessions.byCode, { code });
  const join = useMutation(api.sessions.join);
  const leave = useMutation(api.sessions.leave);
  const end = useMutation(api.sessions.end);

  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (!code) navigate("/dashboard", { replace: true });
  }, [code, navigate]);

  if (!code) return null;

  const copyLink = async () => {
    const link = sessionLink(code);
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = link;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setCopied(true);
    toast.success("Invite link copied");
    window.setTimeout(() => setCopied(false), 2000);
  };

  const handleJoin = async () => {
    if (!code) return;
    setIsJoining(true);
    setJoinError(null);
    try {
      await join({ code });
    } catch (error) {
      setJoinError(
        error instanceof Error ? error.message : "Could not join the session.",
      );
    } finally {
      setIsJoining(false);
    }
  };

  const handleLeave = async () => {
    if (!data) return;
    setIsExiting(true);
    try {
      await leave({ sessionId: data.session._id });
      navigate("/dashboard");
    } catch (error) {
      console.error("Leave error:", error);
      toast.error("Could not leave the session.");
      setIsExiting(false);
    }
  };

  const handleEnd = async () => {
    if (!data) return;
    setIsExiting(true);
    try {
      await end({ sessionId: data.session._id });
      navigate("/dashboard");
    } catch (error) {
      console.error("End error:", error);
      toast.error("Could not end the session.");
      setIsExiting(false);
    }
  };

  // --- Loading -------------------------------------------------------------
  if (data === undefined) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background text-foreground">
        <Wordmark />
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // --- Not found -----------------------------------------------------------
  if (data === null) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-foreground">
        <div className="w-full max-w-sm text-center">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Invite link
          </p>
          <h1 className="mt-3 text-2xl font-medium tracking-tight">
            This session doesn&apos;t exist
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            The link may be mistyped, or the session has already ended.
          </p>
          <Button asChild className="mt-8" variant="outline">
            <Link to="/dashboard">
              <ArrowLeft className="size-4" />
              Back to dashboard
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const { session, host, guest, isMember, myRole, songs } = data;

  // --- Ended ---------------------------------------------------------------
  if (session.status === "ended") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-foreground">
        <div className="w-full max-w-sm text-center">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            {code}
          </p>
          <h1 className="mt-3 text-2xl font-medium tracking-tight">
            This session has ended
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {host?.name} ended the session. Start a new one whenever you&apos;re
            ready to listen together again.
          </p>
          <Button asChild className="mt-8" variant="outline">
            <Link to="/dashboard">
              <ArrowLeft className="size-4" />
              Back to dashboard
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  // --- Active member: the room ---------------------------------------------
  if (isMember && myRole) {
    return (
      <SessionRoom
        sessionId={session._id}
        code={session.code}
        host={{
          name: host?.name ?? "Host",
          image: host?.image ?? null,
        }}
        guest={guest}
        songs={songs}
        isHost={myRole === "host"}
        onLeave={handleLeave}
        onEnd={handleEnd}
      />
    );
  }

  // --- Host waiting room / guest join screen --------------------------------
  const isWaitingHost = myRole === "host" && session.status === "waiting";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-6">
          <Link to="/dashboard" aria-label="Back to dashboard">
            <Wordmark />
          </Link>
          <span className="font-mono text-xs tracking-[0.2em] text-muted-foreground">
            {session.code}
          </span>
        </div>
      </header>

      <main className="mx-auto flex max-w-xl flex-col items-center px-6 py-24 text-center">
        {isWaitingHost ? (
          <>
            <div className="flex size-12 items-center justify-center rounded-full border border-border">
              <Link2 className="size-5 text-muted-foreground" />
            </div>
          <h1 className="mt-6 text-2xl font-medium tracking-tight">
            Your friend is one link away
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            One link, one guest. When they open it and sign in, the music
            starts in sync.
          </p>

            <div className="mt-10 w-full">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                Invite link
              </p>
              <div className="mt-3 flex items-center gap-2 rounded-lg border border-border bg-muted/40 p-2 pl-4">
                <span className="min-w-0 flex-1 truncate text-left text-sm">
                  {sessionLink(session.code)}
                </span>
                <Button
                  variant={copied ? "secondary" : "outline"}
                  size="sm"
                  onClick={copyLink}
                >
                  {copied ? (
                    <Check className="size-4" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Or share the code:{" "}
                <span className="font-mono tracking-widest text-foreground">
                  {session.code}
                </span>
              </p>
            </div>

            <div className="mt-12 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/40" />
                <span className="relative inline-flex size-2 rounded-full bg-primary" />
              </span>
              Room&apos;s open — waiting for your friend…
            </div>

            <Button
              variant="ghost"
              className="mt-10"
              disabled={isExiting}
              onClick={async () => {
                if (!data) return;
                setIsExiting(true);
                try {
                  await end({ sessionId: data.session._id });
                  navigate("/dashboard");
                } catch (error) {
                  console.error("Cancel error:", error);
                  toast.error("Could not cancel the session.");
                  setIsExiting(false);
                }
              }}
            >
              <Square className="size-4" />
              Cancel session
            </Button>
          </>
        ) : (
          <>
            <div className="flex size-12 items-center justify-center rounded-full border border-border">
              <Link2 className="size-5 text-muted-foreground" />
            </div>
            <h1 className="mt-6 text-2xl font-medium tracking-tight">
              {host?.name} saved you a seat
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              They started a two-person listening session and invited you. Join
              to hear the same songs at the same moment — your uploads join the
              shared library too.
            </p>

            {joinError && (
              <p className="mt-4 text-sm text-destructive">{joinError}</p>
            )}

            <Button
              className="mt-8 min-w-44"
              size="lg"
              onClick={handleJoin}
              disabled={isJoining}
            >
              {isJoining ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ArrowRight className="size-4" />
              )}
              Join session
            </Button>
            <Button
              variant="ghost"
              className="mt-4"
              onClick={() => navigate("/dashboard")}
            >
              Not now
            </Button>
          </>
        )}
      </main>
    </div>
  );
}