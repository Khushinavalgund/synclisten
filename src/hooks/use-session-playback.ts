import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useRef, useState } from "react";

export interface SessionSong {
  _id: Id<"songs">;
  title: string;
  artist?: string;
  durationMs?: number;
  url: string | null;
  uploaderId: Id<"users">;
  uploaderName: string;
}

export interface PlaybackState {
  songId?: Id<"songs">;
  positionMs: number;
  isPlaying: boolean;
  updatedAt: number;
}

const SYNC_INTERVAL_MS = 4000;
const DRIFT_TOLERANCE_MS = 1500;

function stateKey(
  songId: Id<"songs"> | null | undefined,
  isPlaying: boolean,
  positionMs: number,
): string {
  return `${songId ?? "none"}|${isPlaying}|${Math.round(positionMs / 1000)}`;
}

/**
 * Keeps one member's <audio> element in lockstep with the shared playback
 * state of a session.
 *
 * Either member can control playback — play, pause, seek or pick the next
 * song — and every change is written to Convex. Both clients apply remote
 * changes to their own element; echoes of a client's own writes are skipped
 * so there are no feedback loops. Each member who is actually listening
 * publishes its current position periodically, keeping both timelines within
 * about a second of each other.
 *
 * Browsers only allow audio to start from a user gesture, so the first time
 * playback is started by the *other* member, the listener sees a "tap to
 * listen" state (`needsActivation`) before audio begins.
 */
export function useSessionPlayback({
  sessionId,
  songs,
  audioRef,
  userActivated,
  onActivate,
}: {
  sessionId: Id<"sessions">;
  songs: SessionSong[];
  audioRef: React.RefObject<HTMLAudioElement | null>;
  userActivated: boolean;
  onActivate: () => void;
}) {
  const playback = useQuery(api.playback.get, { sessionId });
  const patch = useMutation(api.playback.patch);
  const playSong = useMutation(api.playback.playSong);

  const [isPlaying, setIsPlaying] = useState(false);
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);

  // Latest values mirrored into refs so stable callbacks never go stale.
  // Refs are updated inside an effect (never during render).
  const songsRef = useRef(songs);
  const playbackRef = useRef(playback);
  const userActivatedRef = useRef(userActivated);
  const sessionIdRef = useRef(sessionId);
  const patchRef = useRef(patch);
  const playSongRef = useRef(playSong);

  const isPlayingRef = useRef(false);
  const positionRef = useRef(0);
  const loadedSongIdRef = useRef<Id<"songs"> | null>(null);
  /** Key of the remote state we already applied (or wrote ourselves). */
  const appliedKeyRef = useRef("");
  /** Position we last sent to the server, to avoid redundant sync writes. */
  const lastSentPosRef = useRef<number | null>(null);
  /** Seek target queued while a new track's metadata loads. */
  const pendingTargetRef = useRef<{ positionMs: number; play: boolean } | null>(
    null,
  );

  useEffect(() => {
    songsRef.current = songs;
    playbackRef.current = playback;
    userActivatedRef.current = userActivated;
    sessionIdRef.current = sessionId;
    patchRef.current = patch;
    playSongRef.current = playSong;
  });

  /** Loads a track into the element; playback resumes after metadata loads. */
  const loadTrack = useCallback(
    (song: SessionSong, positionMs: number, play: boolean) => {
      const audio = audioRef.current;
      if (!audio) return;
      loadedSongIdRef.current = song._id;
      pendingTargetRef.current = { positionMs, play };
      audio.src = song.url ?? "";
      audio.load();
    },
    [audioRef],
  );

  /**
   * Applies the latest remote playback state to the local element. Skipped
   * when the remote state matches what we already applied/wrote (echo), unless
   * forced (e.g. after the user taps to listen and needs a fresh application).
   */
  const applyRemote = useCallback(
    (force = false) => {
      const remote = playbackRef.current;
      const audio = audioRef.current;
      if (!remote || !audio) return;

      const key = stateKey(remote.songId, remote.isPlaying, remote.positionMs);
      if (!force && key === appliedKeyRef.current) return;

      const song = remote.songId
        ? songsRef.current.find((s) => s._id === remote.songId)
        : undefined;

      if (remote.songId && song) {
        if (loadedSongIdRef.current !== remote.songId) {
          // New track: load it, then seek to the target position.
          loadTrack(song, remote.positionMs, remote.isPlaying);
        } else if (remote.isPlaying) {
          if (!userActivatedRef.current) {
            // Defer playback until the user taps to listen (autoplay policy).
            pendingTargetRef.current = {
              positionMs: remote.positionMs,
              play: true,
            };
          } else {
            const targetMs =
              remote.positionMs + (Date.now() - remote.updatedAt);
            if (Math.abs(audio.currentTime * 1000 - targetMs) > DRIFT_TOLERANCE_MS) {
              audio.currentTime = targetMs / 1000;
            }
            if (audio.paused) {
              audio.play().catch(() => {
                /* autoplay rejected — the tap-to-listen button covers this */
              });
            }
          }
        } else {
          if (!audio.paused) audio.pause();
          if (
            Math.abs(audio.currentTime * 1000 - remote.positionMs) >
            DRIFT_TOLERANCE_MS
          ) {
            audio.currentTime = remote.positionMs / 1000;
          }
        }
      } else if (remote.songId && !song) {
        // Remote song isn't in our library snapshot; leave the element alone.
      } else {
        loadedSongIdRef.current = null;
        if (!audio.paused) audio.pause();
      }

      appliedKeyRef.current = key;
    },
    [audioRef, loadTrack],
  );

  // Re-apply whenever the shared state changes.
  useEffect(() => {
    applyRemote();
  }, [playback, applyRemote]);

  // Wire up element events.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      const ms = Math.round(audio.currentTime * 1000);
      positionRef.current = ms;
      setPositionMs(ms);
    };
    const onLoadedMetadata = () => {
      const d = Math.round(audio.duration * 1000);
      if (isFinite(d)) setDurationMs(d);
      const pending = pendingTargetRef.current;
      if (pending) {
        pendingTargetRef.current = null;
        audio.currentTime = pending.positionMs / 1000;
        if (pending.play && userActivatedRef.current) {
          audio.play().catch(() => {});
        }
      }
    };
    const onPlay = () => {
      isPlayingRef.current = true;
      setIsPlaying(true);
    };
    const onPause = () => {
      isPlayingRef.current = false;
      setIsPlaying(false);
    };
    const onWaiting = () => setIsBuffering(true);
    const onPlaying = () => setIsBuffering(false);
    const onCanPlay = () => setIsBuffering(false);
    const onEnded = () => {
      const remote = playbackRef.current;
      // Only reset the shared state if the track that ended is still current.
      if (
        remote?.songId &&
        loadedSongIdRef.current === remote.songId
      ) {
        lastSentPosRef.current = 0;
        appliedKeyRef.current = stateKey(loadedSongIdRef.current, false, 0);
        patchRef.current({
          sessionId: sessionIdRef.current,
          positionMs: 0,
          isPlaying: false,
        });
      }
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("playing", onPlaying);
    audio.addEventListener("canplay", onCanPlay);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("playing", onPlaying);
      audio.removeEventListener("canplay", onCanPlay);
      audio.removeEventListener("ended", onEnded);
    };
  }, [audioRef]);

  // Each member who is actively listening publishes its position while
  // playing, so the shared timeline tracks the listener's clock and the other
  // side never drifts far.
  useEffect(() => {
    const interval = window.setInterval(() => {
      if (!userActivatedRef.current) return;
      const audio = audioRef.current;
      const remote = playbackRef.current;
      if (!audio || !remote || audio.paused) return;
      const songId = loadedSongIdRef.current ?? remote.songId;
      if (!songId) return;
      const pos = Math.round(audio.currentTime * 1000);
      if (
        lastSentPosRef.current !== null &&
        Math.abs(pos - lastSentPosRef.current) < 1500
      ) {
        return;
      }
      lastSentPosRef.current = pos;
      appliedKeyRef.current = stateKey(songId, true, pos);
      patchRef.current({
        sessionId: sessionIdRef.current,
        positionMs: pos,
        isPlaying: true,
      });
    }, SYNC_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [audioRef]);

  /** First gesture: permit audio to start following the shared playback. */
  const activate = useCallback(() => {
    userActivatedRef.current = true;
    // A stale queued seek would yank the audio backwards once metadata loads;
    // applyRemote(true) below re-targets from the freshest remote state.
    pendingTargetRef.current = null;
    onActivate();
    applyRemote(true);
  }, [applyRemote, onActivate]);

  /** Pick a song from the shared library. Either member can do this. */
  const pickSong = useCallback(
    (songId: Id<"songs">) => {
      const song = songsRef.current.find((s) => s._id === songId);
      const audio = audioRef.current;
      if (!song || !audio) return;

      // The click is a user gesture: mark the member as listening so remote
      // changes keep flowing, and start audio right away.
      userActivatedRef.current = true;
      onActivate();

      loadTrack(song, 0, true);
      appliedKeyRef.current = stateKey(songId, true, 0);
      lastSentPosRef.current = 0;
      playSongRef.current({ sessionId: sessionIdRef.current, songId }).catch(
        () => {},
      );
      // Play within the gesture; the browser queues it until metadata loads.
      audio.play().catch(() => {});
    },
    [audioRef, loadTrack, onActivate],
  );

  /** Play or pause the current track. Either member can do this. */
  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const remote = playbackRef.current;
    const songId = loadedSongIdRef.current ?? remote?.songId;

    if (!songId) {
      const first = songsRef.current[0];
      if (first) {
        pickSong(first._id);
      }
      return;
    }

    const pos = Math.round(audio.currentTime * 1000);
    userActivatedRef.current = true;
    onActivate();

    if (audio.paused) {
      // Make sure the remote track is actually loaded before playing.
      if (remote?.songId && loadedSongIdRef.current !== remote.songId) {
        const song = songsRef.current.find((s) => s._id === remote.songId);
        if (song) {
          const target = Math.round(remote.positionMs);
          loadTrack(song, target, true);
          appliedKeyRef.current = stateKey(remote.songId, true, target);
          lastSentPosRef.current = target;
          patchRef.current({
            sessionId: sessionIdRef.current,
            positionMs: target,
            isPlaying: true,
          });
          audio.play().catch(() => {});
          return;
        }
      }
      audio.play().catch(() => {});
      appliedKeyRef.current = stateKey(songId, true, pos);
      lastSentPosRef.current = pos;
      patchRef.current({
        sessionId: sessionIdRef.current,
        positionMs: pos,
        isPlaying: true,
      });
    } else {
      audio.pause();
      appliedKeyRef.current = stateKey(songId, false, pos);
      lastSentPosRef.current = pos;
      patchRef.current({
        sessionId: sessionIdRef.current,
        positionMs: pos,
        isPlaying: false,
      });
    }
  }, [audioRef, loadTrack, onActivate, pickSong]);

  /** Seek to a position in the current track. Either member can do this. */
  const seek = useCallback(
    (ms: number) => {
      const audio = audioRef.current;
      if (!audio) return;
      const songId = loadedSongIdRef.current ?? playbackRef.current?.songId;
      if (!songId) return;

      const clamped = Math.max(0, Math.min(ms, audio.duration * 1000 || ms));
      audio.currentTime = clamped / 1000;
      positionRef.current = clamped;
      setPositionMs(clamped);

      lastSentPosRef.current = clamped;
      appliedKeyRef.current = stateKey(songId, isPlayingRef.current, clamped);
      patchRef.current({
        sessionId: sessionIdRef.current,
        positionMs: clamped,
        isPlaying: isPlayingRef.current,
      });
    },
    [audioRef],
  );

  // A member needs a tap before audio can start whenever the shared state is
  // playing but that member hasn't interacted yet (autoplay policy).
  const needsActivation = !userActivated && playback?.isPlaying === true;

  return {
    playback: playback ?? null,
    isPlaying,
    positionMs,
    durationMs,
    isBuffering,
    needsActivation,
    activate,
    pickSong,
    togglePlay,
    seek,
  };
}