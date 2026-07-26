import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireMember } from "./lib/auth";
import { dayKeyFor } from "./lib/dates";
import { internal } from "./_generated/api";

export const throwDare = mutation({
  args: {
    roomId: v.id("rooms"),
    targetId: v.id("users"),
    problemId: v.id("problems"),
  },
  handler: async (ctx, { roomId, targetId, problemId }) => {
    const { user } = await requireMember(ctx, roomId);

    if (targetId === user._id) throw new Error("Can't dare yourself");

    const targetMembership = await ctx.db
      .query("memberships")
      .withIndex("by_room_user", (q) =>
        q.eq("roomId", roomId).eq("userId", targetId)
      )
      .unique();
    if (!targetMembership || targetMembership.leftAt) {
      throw new Error("That person isn't in this room");
    }

    const problem = await ctx.db.get(problemId);
    if (!problem || problem.roomId !== roomId) {
      throw new Error("Problem not in this room");
    }

    // only block a duplicate PENDING dare — re-daring a cleared one is fine
    const roomEvents = await ctx.db
      .query("events")
      .withIndex("by_room", (q) => q.eq("roomId", roomId))
      .collect();
    const alreadyPending = roomEvents.some(
      (e) =>
        e.kind === "dare" &&
        e.targetId === targetId &&
        e.problemId === problemId &&
        !e.done
    );
    if (alreadyPending) throw new Error("That dare is already pending");

    await ctx.db.insert("events", {
      roomId,
      userId: user._id,
      kind: "dare",
      targetId,
      problemId,
      done: false,
      dayKey: dayKeyFor(user.tz),
    });
  },
});

export const accept = mutation({
  args: { eventId: v.id("events") },
  handler: async (ctx, { eventId }) => {
    const event = await ctx.db.get(eventId);
    if (!event || event.kind !== "dare") throw new Error("Not a dare");
    const { user } = await requireMember(ctx, event.roomId);
    if (event.targetId !== user._id) throw new Error("This dare isn't for you");

    await ctx.db.patch(eventId, { done: true, dareStatus: "accepted" });

    const problem = event.problemId ? await ctx.db.get(event.problemId) : null;
    await ctx.scheduler.runAfter(0, internal.push.sendToUserInternal, {
      userId: event.userId,
      title: "Dare cleared ✅",
      body: `${user.name} finished your dare: ${problem?.title || "a problem"}`,
    });
  },
});

export const decline = mutation({
  args: { eventId: v.id("events") },
  handler: async (ctx, { eventId }) => {
    const event = await ctx.db.get(eventId);
    if (!event || event.kind !== "dare") throw new Error("Not a dare");
    const { user } = await requireMember(ctx, event.roomId);
    if (event.targetId !== user._id) throw new Error("This dare isn't for you");

    await ctx.db.patch(eventId, { dareStatus: "declined" });

    const problem = event.problemId ? await ctx.db.get(event.problemId) : null;
    await ctx.scheduler.runAfter(0, internal.push.sendToUserInternal, {
      userId: event.userId,
      title: "Dare declined 🙅",
      body: `${user.name} passed on: ${problem?.title || "a problem"}`,
    });
  },
});