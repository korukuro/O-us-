import { mutation, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUser } from "./lib/auth";
import { dayKeyFor } from "./lib/dates";

export const saveSubscription = mutation({
  args: { subscription: v.string() },
  handler: async (ctx, { subscription }) => {
    const user = await getCurrentUser(ctx);
    const existing = await ctx.db
      .query("pushSubs")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const endpoint = JSON.parse(subscription).endpoint;
    if (existing.some((s) => JSON.parse(s.subscription).endpoint === endpoint)) return;
    await ctx.db.insert("pushSubs", { userId: user._id, subscription });
  },
});

export const getSubsForUser = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("pushSubs")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const deleteSub = internalMutation({
  args: { id: v.id("pushSubs") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});

// users who locked a plan today but haven't cleared it — for the evening nudge
export const usersWithIncompletePlans = internalQuery({
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    const result = [];

    for (const user of users) {
      const dayKey = dayKeyFor(user.tz);
      const plans = await ctx.db
        .query("plans")
        .withIndex("by_user_day", (q) =>
          q.eq("userId", user._id).eq("dayKey", dayKey)
        )
        .collect();

      // any locked plan today that isn't fully done?
      let needsNudge = false;
      for (const plan of plans) {
        if (!plan.lockedAt) continue;
        const solves = await ctx.db
          .query("solves")
          .withIndex("by_room_user", (q) =>
            q.eq("roomId", plan.roomId).eq("userId", user._id)
          )
          .collect();
        const solvedIds = new Set(solves.map((s) => s.problemId));
        const done = plan.problemIds.filter((id) => solvedIds.has(id)).length;
        if (done < plan.problemIds.length) { needsNudge = true; break; }
      }
      if (needsNudge) result.push(user._id);
    }
    return result;
  },
});

export const removeSubscription = mutation({
  args: { endpoint: v.string() },
  handler: async (ctx, { endpoint }) => {
    const user = await getCurrentUser(ctx);
    const rows = await ctx.db
      .query("pushSubs")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const r of rows) {
      if (JSON.parse(r.subscription).endpoint === endpoint) {
        await ctx.db.delete(r._id);
      }
    }
  },
});