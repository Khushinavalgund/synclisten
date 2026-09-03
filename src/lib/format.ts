/** Formats a millisecond duration as m:ss (e.g. 305000 → "5:05"). */
export function formatDuration(ms?: number | null): string {
  if (ms === undefined || ms === null || !isFinite(ms) || ms < 0) {
    return "--:--";
  }
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/** The absolute invite link for a session code. */
export function sessionLink(code: string): string {
  return `${window.location.origin}/session/${code}`;
}

/** Reads an audio file's duration in milliseconds via the browser. */
export function readAudioDurationMs(file: File): Promise<number | undefined> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    audio.preload = "metadata";
    let settled = false;
    const cleanup = () => {
      if (!settled) {
        settled = true;
        URL.revokeObjectURL(url);
      }
    };
    audio.onloadedmetadata = () => {
      const ms = isFinite(audio.duration)
        ? Math.round(audio.duration * 1000)
        : undefined;
      cleanup();
      resolve(ms);
    };
    audio.onerror = () => {
      cleanup();
      resolve(undefined);
    };
    audio.src = url;
    window.setTimeout(() => {
      cleanup();
      resolve(undefined);
    }, 10_000);
  });
}