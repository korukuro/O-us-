import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const store = mutation({
  args: { tz: v.string() },
  handler: async (ctx, { tz }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not signed in");

    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (existing) {
      if (existing.name !== identity.name || existing.tz !== tz) {
        await ctx.db.patch(existing._id, {
          name: identity.name ?? existing.name,
          tz,
        });
      }
      return existing._id;
    }

    return await ctx.db.insert("users", {
      clerkId: identity.subject,
      name: identity.name ?? "Anonymous",
      avatar: identity.pictureUrl ?? "",
      tz,
    });
  },
});

export const current = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    return await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .unique();
  },
});