import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireMember } from "./lib/auth";
import { dayKeyFor } from "./lib/dates";

// Get or lazily create today's plan for the caller.
async function getTodayPlan(ctx, roomId, user) {
  const dayKey = dayKeyFor(user.tz);
  const plans = await ctx.db
    .query("plans")
    .withIndex("by_user_day", (q) =>
      q.eq("userId", user._id).eq("dayKey", dayKey)
    )
    .collect();
  const mine = plans.find((p) => p.roomId === roomId);
  return { dayKey, plan: mine ?? null };
}

export const today = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, { roomId }) => {
    const { user } = await requireMember(ctx, roomId);
    const { plan } = await getTodayPlan(ctx, roomId, user);
    if (!plan) return { problemIds: [], locked: false, done: 0, target: 0 };

    // count how many plan problems the user has solved
    const solves = await ctx.db
      .query("solves")
      .withIndex("by_room_user", (q) =>
        q.eq("roomId", roomId).eq("userId", user._id)
      )
      .collect();
    const solvedIds = new Set(solves.map((s) => s.problemId));
    const done = plan.problemIds.filter((id) => solvedIds.has(id)).length;

    return {
      problemIds: plan.problemIds,
      locked: !!plan.lockedAt,
      done,
      target: plan.problemIds.length,
    };
  },
});

// Set (before lock) or grow (after lock) today's problem list.
export const setProblems = mutation({
  args: { roomId: v.id("rooms"), problemIds: v.array(v.id("problems")) },
  handler: async (ctx, { roomId, problemIds }) => {
    const { user } = await requireMember(ctx, roomId);
    const { dayKey, plan } = await getTodayPlan(ctx, roomId, user);

    if (!plan) {
      await ctx.db.insert("plans", {
        roomId,
        userId: user._id,
        dayKey,
        problemIds,
      });
      return;
    }

    // THE GROW-ONLY RULE: once locked, every previously-locked id must remain.
    if (plan.lockedAt) {
      const kept = plan.problemIds.every((id) => problemIds.includes(id));
      if (!kept) throw new Error("Locked plans can only grow, not shrink");
    }
    await ctx.db.patch(plan._id, { problemIds });
  },
});

export const lock = mutation({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, { roomId }) => {
    const { user } = await requireMember(ctx, roomId);
    const { plan } = await getTodayPlan(ctx, roomId, user);
    if (!plan) throw new Error("No plan to lock — pick problems first");
    if (plan.lockedAt) return; // already locked, idempotent
    if (plan.problemIds.length === 0) throw new Error("Pick at least one problem");
    await ctx.db.patch(plan._id, { lockedAt: Date.now() });
  },
});