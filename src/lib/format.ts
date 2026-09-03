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

// Session codes are 6 chars from A–Z (minus I and O) and digits 2–9.
const SESSION_CODE_RE = /^[A-HJ-NP-Z2-9]{6}$/;

/**
 * Normalizes raw user input (a code or a full invite link) into a valid
 * session code, or null when the input can't be a session code.
 */
export function extractSessionCode(input: string): string | null {
  if (!input) return null;
  const raw = input.trim();
  if (!raw) return null;
  // Accept a pasted invite link: https://host/session/K7M2QX or /session/K7M2QX
  const linkMatch = raw.match(/\/session\/([A-Za-z0-9]+)/);
  const candidate = linkMatch ? linkMatch[1] : raw;
  const normalized = candidate.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return SESSION_CODE_RE.test(normalized) ? normalized : null;
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