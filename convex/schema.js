import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    name: v.string(),
    avatar: v.string(),
    tz: v.string(),
  }).index("by_clerk", ["clerkId"]),

  rooms: defineTable({
    name: v.string(),
    code: v.string(),
    ownerId: v.id("users"),
    sheetName: v.optional(v.string()),
  }).index("by_code", ["code"]),

  memberships: defineTable({
    roomId: v.id("rooms"),
    userId: v.id("users"),
    xp: v.number(),
    streak: v.number(),
    lastDayKey: v.string(),
    freezeTokens: v.number(),
    role: v.union(v.literal("owner"), v.literal("member")),
    leftAt: v.optional(v.number()),
  })
    .index("by_room", ["roomId"])
    .index("by_user", ["userId"])
    .index("by_room_user", ["roomId", "userId"]),

  problems: defineTable({
    roomId: v.id("rooms"),
    slug: v.string(),
    title: v.string(),
    url: v.optional(v.string()),
    platform: v.string(),
    difficulty: v.string(),
    topics: v.array(v.string()),
    addedBy: v.id("users"),
  })
    .index("by_room", ["roomId"])
    .index("by_room_slug", ["roomId", "slug"]),

  solves: defineTable({
    roomId: v.id("rooms"),
    problemId: v.id("problems"),
    userId: v.id("users"),
    takeaway: v.optional(v.string()),
    dayKey: v.string(),
  })
    .index("by_problem", ["problemId"])
    .index("by_room_user", ["roomId", "userId"])
    .index("by_user_day", ["userId", "dayKey"]),

  plans: defineTable({
    roomId: v.id("rooms"),
    userId: v.id("users"),
    dayKey: v.string(),
    problemIds: v.array(v.id("problems")),
    lockedAt: v.optional(v.number()),
  })
    .index("by_user_day", ["userId", "dayKey"])
    .index("by_room_day", ["roomId", "dayKey"]),

  events: defineTable({
    roomId: v.id("rooms"),
    userId: v.id("users"),
    kind: v.union(
      v.literal("solve"),
      v.literal("text"),
      v.literal("dare"),
      v.literal("system")
    ),
    body: v.optional(v.string()),
    problemId: v.optional(v.id("problems")),
    targetId: v.optional(v.id("users")),
    difficulty: v.optional(v.string()),
    flavor: v.optional(v.string()),
    offPlan: v.optional(v.boolean()),
    done: v.optional(v.boolean()),
    dayKey: v.string(),
    done: v.optional(v.boolean()),
    dareStatus: v.optional(v.string()), // "pending" | "accepted" | "declined"
    dayKey: v.string(),
    replyTo: v.optional(v.id("events")),
  }).index("by_room", ["roomId"]),

  reactions: defineTable({
    eventId: v.id("events"),
    userId: v.id("users"),
    emoji: v.string(),
  }).index("by_event", ["eventId"]),

  pushSubs: defineTable({
    userId: v.id("users"),
    subscription: v.string(),
  }).index("by_user", ["userId"]),
});
