import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/wordmark";
import { ArrowRight, Link2, Music2, Pause, Play } from "lucide-react";
import { Link } from "react-router";

function SyncPanel() {
  const tracks = [
    { label: "You", time: "1:24", width: "45%" },
    { label: "Your friend", time: "1:24", width: "45%" },
  ];
  return (
    <div className="mx-auto w-full max-w-xl rounded-lg border border-border p-8 sm:p-10">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Session · K7M2QX
        </p>
        <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
          <span className="size-1.5 rounded-full bg-foreground" />
          in sync
        </span>
      </div>

      <div className="mt-8 flex items-center gap-4">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border">
          <Pause className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">Golden Hour</p>
          <p className="truncate text-xs text-muted-foreground">
            JVKE · your library
          </p>
        </div>
        <p className="text-xs tabular-nums text-muted-foreground">3:05</p>
      </div>

      <div className="mt-8 flex flex-col gap-6">
        {tracks.map((track) => (
          <div key={track.label} className="flex items-center gap-4">
            <span className="w-20 shrink-0 text-xs text-muted-foreground">
              {track.label}
            </span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: track.width }}
              />
            </div>
            <span className="w-10 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
              {track.time}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const steps = [
  {
    number: "01",
    icon: Music2,
    title: "Upload your music",
    body: "Drop any audio file into your library — any format, any duration. There is no length limit and no algorithm.",
  },
  {
    number: "02",
    icon: Link2,
    title: "Share one link",
    body: "Start a session and send the invite to exactly one friend. A private room for two, nothing more.",
  },
  {
    number: "03",
    icon: Play,
    title: "Play in sync",
    body: "Either of you can pick the next song. Play, pause and seek on one side land on the other, to the second.",
  },
];

export default function Landing() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Nav */}
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <Wordmark />
          <Button asChild variant="ghost" size="sm">
            <Link to="/auth?returnTo=/dashboard">Sign in</Link>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b border-border">
        <div className="mx-auto flex max-w-5xl flex-col items-center px-6 py-24 text-center sm:py-32">
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-muted-foreground">
            Private listening for two
          </p>
          <h1 className="mt-6 max-w-2xl text-5xl font-medium tracking-tight sm:text-6xl">
            Listen together.
          </h1>
          <p className="mt-6 max-w-md text-base leading-7 text-muted-foreground">
            Upload your own tracks — any length. Share a single invite link.
            You and a friend hear every song at the same moment.
          </p>
          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link to="/auth?returnTo=/dashboard">
                Open Duet
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="lg">
              <a href="#how-it-works">How it works</a>
            </Button>
          </div>
        </div>
      </section>

      {/* Sync visual */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-5xl px-6 py-20 sm:py-24">
          <SyncPanel />
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="border-b border-border">
        <div className="mx-auto max-w-5xl px-6 py-20 sm:py-24">
          <h2 className="text-xs font-medium uppercase tracking-[0.25em] text-muted-foreground">
            How it works
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3">
            {steps.map((step) => (
              <div
                key={step.number}
                className="flex flex-col gap-6 bg-background p-8"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {step.number}
                  </span>
                  <step.icon className="size-4 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-base font-medium tracking-tight">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {step.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-b border-border">
        <div className="mx-auto flex max-w-5xl flex-col items-center px-6 py-20 text-center sm:py-28">
          <h2 className="max-w-xl text-3xl font-medium tracking-tight sm:text-4xl">
            Your music. One friend. In perfect time.
          </h2>
          <Button asChild size="lg" className="mt-10">
            <Link to="/auth?returnTo=/dashboard">
              Start listening
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-10 sm:flex-row sm:items-center sm:justify-between">
        <Wordmark />
        <p className="text-xs text-muted-foreground">
          Built for two people. © {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
}