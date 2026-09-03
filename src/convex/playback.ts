import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";

import { mutation, query } from "./_generated/server";

/**
 * The shared playback state for a session. Only members can read it; it is a
 * reactive subscription, so both clients update in near real time.
 */
export const get = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;

    const session = await ctx.db.get(sessionId);
    if (session === null) return null;
    if (session.hostId !== userId && session.guestId !== userId) return null;

    const playback = await ctx.db
      .query("playback")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .first();
    return playback ?? null;
  },
});

/**
 * Partial update of the shared playback state. Only the host may change
 * play/pause/position; both members may pick songs via `playSong`.
 */
export const patch = mutation({
  args: {
    sessionId: v.id("sessions"),
    songId: v.optional(v.id("songs")),
    positionMs: v.optional(v.number()),
    isPlaying: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not signed in");

    const session = await ctx.db.get(args.sessionId);
    if (session === null) throw new Error("Session not found.");
    if (session.hostId !== userId) {
      throw new Error("Only the host controls playback.");
    }
    if (session.status === "ended") throw new Error("This session has ended.");

    const playback = await ctx.db
      .query("playback")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();
    if (playback === null) throw new Error("Playback state not found.");

    await ctx.db.patch(playback._id, {
      updatedAt: Date.now(),
      ...(args.songId !== undefined ? { songId: args.songId } : {}),
      ...(args.positionMs !== undefined
        ? { positionMs: Math.max(0, Math.round(args.positionMs)) }
        : {}),
      ...(args.isPlaying !== undefined ? { isPlaying: args.isPlaying } : {}),
    });
  },
});

/**
 * Picks a song from the shared library and starts playing it. Both members
 * can do this — the last pick wins.
 */
export const playSong = mutation({
  args: {
    sessionId: v.id("sessions"),
    songId: v.id("songs"),
  },
  handler: async (ctx, { sessionId, songId }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not signed in");

    const session = await ctx.db.get(sessionId);
    if (session === null) throw new Error("Session not found.");
    if (session.hostId !== userId && session.guestId !== userId) {
      throw new Error("You are not in this session.");
    }
    if (session.status === "ended") throw new Error("This session has ended.");

    const song = await ctx.db.get(songId);
    if (song === null) throw new Error("Song not found.");
    if (song.userId !== session.hostId && song.userId !== session.guestId) {
      throw new Error("That song is not part of this session.");
    }

    const playback = await ctx.db
      .query("playback")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .first();
    if (playback === null) throw new Error("Playback state not found.");

    await ctx.db.patch(playback._id, {
      songId,
      positionMs: 0,
      isPlaying: true,
      updatedAt: Date.now(),
    });
  },
});