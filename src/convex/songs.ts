import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";

import { mutation, query } from "./_generated/server";

/**
 * Returns a short-lived URL the client can PUT a file to. Files stored this
 * way can be any size, so uploads of any audio duration are supported.
 */
export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not signed in");
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Records an uploaded audio file in the songs table.
 */
export const save = mutation({
  args: {
    storageId: v.id("_storage"),
    title: v.string(),
    artist: v.optional(v.string()),
    durationMs: v.optional(v.number()),
    mimeType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not signed in");

    // The writer surface cannot read file contents, but a null URL means the
    // storageId does not exist — fail fast before recording the song.
    const url = await ctx.storage.getUrl(args.storageId);
    if (url === null) {
      throw new Error("Upload failed — the file was not stored.");
    }

    const title = args.title.trim().slice(0, 300);
    if (title === "") throw new Error("A title is required.");

    await ctx.db.insert("songs", {
      userId,
      title,
      artist: args.artist?.trim().slice(0, 300) || undefined,
      storageId: args.storageId,
      durationMs: args.durationMs,
      mimeType: args.mimeType,
      createdAt: Date.now(),
    });
  },
});

/**
 * The signed-in user's own songs, newest first, with playable URLs.
 */
export const listMine = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];

    const songs = await ctx.db
      .query("songs")
      .withIndex("by_user_created", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    return Promise.all(
      songs.map(async (song) => ({
        ...song,
        url: await ctx.storage.getUrl(song.storageId),
      })),
    );
  },
});