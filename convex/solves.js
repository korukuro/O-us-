import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireMember } from "./lib/auth";
import { dayKeyFor } from "./lib/dates";

const XP = { easy: 10, medium: 25, hard: 50 };

export const log = mutation({
  args: {
    roomId: v.id("rooms"),
    problemId: v.id("problems"),
    takeaway: v.optional(v.string()),
  },
  handler: async (ctx, { roomId, problemId, takeaway }) => {
    const { user, membership } = await requireMember(ctx, roomId);

    const problem = await ctx.db.get(problemId);
    if (!problem || problem.roomId !== roomId) {
      throw new Error("Problem not in this room");
    }

    // Prevent double-logging the same problem
    const already = await ctx.db
      .query("solves")
      .withIndex("by_room_user", (q) =>
        q.eq("roomId", roomId).eq("userId", user._id)
      )
      .collect();
    if (already.some((s) => s.problemId === problemId)) {
      throw new Error("You already solved this one");
    }

    const dayKey = dayKeyFor(user.tz);

    // 1. the solve row
    await ctx.db.insert("solves", {
      roomId,
      problemId,
      userId: user._id,
      takeaway: takeaway?.trim() || undefined,
      dayKey,
    });

    // 2. award XP onto the membership (per-room, not per-user)
    const gained = XP[problem.difficulty] ?? 0;
    await ctx.db.patch(membership._id, { xp: membership.xp + gained });

    // 3. drop a solve event into the feed
    await ctx.db.insert("events", {
      roomId,
      userId: user._id,
      kind: "solve",
      problemId,
      difficulty: problem.difficulty,
      dayKey,
    });

    return { gained };
  },
});

export const sendMessage = mutation({
  args: { roomId: v.id("rooms"), body: v.string() },
  handler: async (ctx, { roomId, body }) => {
    const { user } = await requireMember(ctx, roomId);
    if (!body.trim()) throw new Error("Empty message");
    await ctx.db.insert("events", {
      roomId,
      userId: user._id,
      kind: "text",
      body: body.trim(),
      dayKey: dayKeyFor(user.tz),
    });
  },
});