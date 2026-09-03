import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// default user roles. can add / remove based on the project as needed
export const ROLES = {
  ADMIN: "admin",
  USER: "user",
  MEMBER: "member",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.USER),
  v.literal(ROLES.MEMBER),
);
export type Role = Infer<typeof roleValidator>;

const schema = defineSchema(
  {
    // default auth tables using convex auth.
    ...authTables, // do not remove or modify

    // the users table is the default users table that is brought in by the authTables
    users: defineTable({
      name: v.optional(v.string()), // name of the user. do not remove
      image: v.optional(v.string()), // image of the user. do not remove
      email: v.optional(v.string()), // email of the user. do not remove
      emailVerificationTime: v.optional(v.number()), // email verification time. do not remove
      isAnonymous: v.optional(v.boolean()), // is the user anonymous. do not remove

      role: v.optional(roleValidator), // role of the user. do not remove
    }).index("email", ["email"]), // index for the email. do not remove or modify

    // User-uploaded audio files (any size / duration).
    songs: defineTable({
      userId: v.id("users"), // who uploaded this song
      title: v.string(),
      artist: v.optional(v.string()),
      storageId: v.id("_storage"), // Convex file storage id
      durationMs: v.optional(v.number()),
      mimeType: v.optional(v.string()),
      createdAt: v.number(),
    }).index("by_user_created", ["userId", "createdAt"]),

    // A two-person listening session. The host creates it and shares the
    // invite code; one guest can join.
    sessions: defineTable({
      code: v.string(), // short invite code, e.g. "K7M2QX"
      hostId: v.id("users"),
      guestId: v.optional(v.id("users")),
      status: v.union(
        v.literal("waiting"), // waiting for the guest to join
        v.literal("active"), // both members present
        v.literal("ended"),
      ),
      createdAt: v.number(),
      endedAt: v.optional(v.number()),
    })
      .index("by_code", ["code"])
      .index("by_host", ["hostId"])
      .index("by_guest", ["guestId"]),

    // Single row per session: the shared playback state both members sync to.
    playback: defineTable({
      sessionId: v.id("sessions"),
      songId: v.optional(v.id("songs")),
      positionMs: v.number(),
      isPlaying: v.boolean(),
      updatedAt: v.number(), // wall-clock timestamp of the last change
    }).index("by_session", ["sessionId"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;
