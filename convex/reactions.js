import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireMember, getCurrentUser } from "./lib/auth";

export const toggle = mutation({
  args: { eventId: v.id("events"), emoji: v.string() },
  handler: async (ctx, { eventId, emoji }) => {
    const event = await ctx.db.get(eventId);
    if (!event) throw new Error("No such event");
    await requireMember(ctx, event.roomId); // must be in the room to react

    const user = await getCurrentUser(ctx);

    const existing = await ctx.db
      .query("reactions")
      .withIndex("by_event", (q) => q.eq("eventId", eventId))
      .collect();

    const mine = existing.find(
      (r) => r.userId === user._id && r.emoji === emoji
    );

    if (mine) {
      await ctx.db.delete(mine._id); // tap again to remove
    } else {
      await ctx.db.insert("reactions", { eventId, userId: user._id, emoji });
    }
  },
});