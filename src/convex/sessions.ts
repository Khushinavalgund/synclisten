import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I
const CODE_LENGTH = 6;

function randomCode(): string {
  let out = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return out;
}

function displayName(
  user: { name?: string; email?: string } | null,
): string {
  if (user?.name && user.name.trim() !== "") return user.name;
  if (user?.email) return user.email.split("@")[0];
  return "Anonymous";
}

/**
 * Creates a new session with a unique invite code. A user can only host one
 * open session at a time.
 */
export const create = mutation({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not signed in");

    const existing = await ctx.db
      .query("sessions")
      .withIndex("by_host", (q) => q.eq("hostId", userId))
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "waiting"),
          q.eq(q.field("status"), "active"),
        ),
      )
      .first();
    if (existing !== null) {
      throw new Error("You already have an open session.");
    }

    let code = randomCode();
    for (let i = 0; i < 10; i++) {
      const taken = await ctx.db
        .query("sessions")
        .withIndex("by_code", (q) => q.eq("code", code))
        .first();
      if (taken === null) break;
      code = randomCode();
    }

    const sessionId = await ctx.db.insert("sessions", {
      code,
      hostId: userId,
      status: "waiting",
      createdAt: Date.now(),
    });
    await ctx.db.insert("playback", {
      sessionId,
      positionMs: 0,
      isPlaying: false,
      updatedAt: Date.now(),
    });

    return { code };
  },
});

/**
 * Full session view used by the session page. Songs from both members are
 * only returned to members of the session.
 */
export const byCode = query({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return { status: "unauthenticated" as const };

    const session = await ctx.db
      .query("sessions")
      .withIndex("by_code", (q) => q.eq("code", code.trim().toUpperCase()))
      .first();
    if (session === null) return { status: "not_found" as const };

    const [host, guest] = await Promise.all([
      ctx.db.get(session.hostId),
      session.guestId ? ctx.db.get(session.guestId) : null,
    ]);

    const isHost = session.hostId === userId;
    const isGuest = session.guestId === userId;
    const isMember = isHost || isGuest;

    let songs: Array<{
      _id: Id<"songs">;
      title: string;
      artist?: string;
      durationMs?: number;
      url: string | null;
      uploaderId: Id<"users">;
      uploaderName: string;
    }> = [];

    if (isMember) {
      const memberIds = [
        session.hostId,
        ...(session.guestId ? [session.guestId] : []),
      ];
      const members = await Promise.all(memberIds.map((id) => ctx.db.get(id)));
      const nameById = new Map(
        members
          .filter((m): m is NonNullable<typeof m> => m !== null)
          .map((m) => [m._id, displayName(m)]),
      );

      const perUser = await Promise.all(
        memberIds.map((id) =>
          ctx.db
            .query("songs")
            .withIndex("by_user_created", (q) => q.eq("userId", id))
            .order("desc")
            .collect(),
        ),
      );
      const all = perUser.flat();
      songs = await Promise.all(
        all.map(async (song) => ({
          _id: song._id,
          title: song.title,
          artist: song.artist,
          durationMs: song.durationMs,
          url: await ctx.storage.getUrl(song.storageId),
          uploaderId: song.userId,
          uploaderName: nameById.get(song.userId) ?? "Anonymous",
        })),
      );
    }

    return {
      status: "ok" as const,
      session: {
        _id: session._id,
        code: session.code,
        status: session.status,
        createdAt: session.createdAt,
      },
      host: host
        ? { name: displayName(host), image: host.image ?? null }
        : null,
      guest: guest
        ? { name: displayName(guest), image: guest.image ?? null }
        : null,
      isMember,
      myRole: isHost ? "host" : isGuest ? "guest" : null,
      songs,
    };
  },
});

/**
 * Joins a session by invite code. Fails when a guest is already seated.
 */
export const join = mutation({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not signed in");

    const session = await ctx.db
      .query("sessions")
      .withIndex("by_code", (q) => q.eq("code", code.trim().toUpperCase()))
      .first();
    if (session === null) throw new Error("Session not found.");

    if (session.hostId === userId) return { code: session.code };
    if (session.status === "ended") {
      throw new Error("This session has ended.");
    }
    if (session.guestId === userId) return { code: session.code };
    if (session.guestId !== undefined) {
      throw new Error("This session already has a guest.");
    }

    await ctx.db.patch(session._id, { guestId: userId, status: "active" });
    return { code: session.code };
  },
});

/**
 * The guest leaves; the session returns to waiting so someone else can join.
 */
export const leave = mutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not signed in");

    const session = await ctx.db.get(sessionId);
    if (session === null) throw new Error("Session not found.");
    if (session.hostId === userId) {
      throw new Error("The host cannot leave — end the session instead.");
    }
    if (session.guestId !== userId) throw new Error("You are not in this session.");

    await ctx.db.patch(session._id, { guestId: undefined, status: "waiting" });

    const playback = await ctx.db
      .query("playback")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .first();
    if (playback !== null) {
      await ctx.db.patch(playback._id, {
        songId: undefined,
        positionMs: 0,
        isPlaying: false,
        updatedAt: Date.now(),
      });
    }
  },
});

/**
 * The host ends the session for both members.
 */
export const end = mutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not signed in");

    const session = await ctx.db.get(sessionId);
    if (session === null) throw new Error("Session not found.");
    if (session.hostId !== userId) {
      throw new Error("Only the host can end the session.");
    }

    await ctx.db.patch(session._id, {
      status: "ended",
      endedAt: Date.now(),
    });
  },
});

/**
 * The user's current open session (as host or guest), if any. Used by the
 * dashboard to offer a return path and prevent stacking sessions.
 */
export const getMySession = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;

    const open = (s: { status: string }) =>
      s.status === "waiting" || s.status === "active";

    const asHost = await ctx.db
      .query("sessions")
      .withIndex("by_host", (q) => q.eq("hostId", userId))
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "waiting"),
          q.eq(q.field("status"), "active"),
        ),
      )
      .first();
    if (asHost !== null && open(asHost)) {
      return {
        session: { _id: asHost._id, code: asHost.code, status: asHost.status },
        myRole: "host",
      };
    }

    const asGuest = await ctx.db
      .query("sessions")
      .withIndex("by_guest", (q) => q.eq("guestId", userId))
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "waiting"),
          q.eq(q.field("status"), "active"),
        ),
      )
      .first();
    if (asGuest !== null && open(asGuest)) {
      return {
        session: { _id: asGuest._id, code: asGuest.code, status: asGuest.status },
        myRole: "guest",
      };
    }

    return null;
  },
});