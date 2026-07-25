import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireMember } from "./lib/auth";

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const add = mutation({
  args: {
    roomId: v.id("rooms"),
    title: v.string(),
    slug: v.string(),
    url: v.optional(v.string()),
    platform: v.string(),
    difficulty: v.string(),
    topics: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireMember(ctx, args.roomId);

    // Trust the title, but re-derive the slug for dedupe integrity
    const slug = args.slug || slugify(args.title);

    const existing = await ctx.db
      .query("problems")
      .withIndex("by_room_slug", (q) =>
        q.eq("roomId", args.roomId).eq("slug", slug)
      )
      .unique();
    if (existing) throw new Error("This problem is already in the bank");

    if (!["easy", "medium", "hard"].includes(args.difficulty)) {
      throw new Error("Invalid difficulty");
    }

    return await ctx.db.insert("problems", {
      roomId: args.roomId,
      slug,
      title: args.title.trim(),
      url: args.url?.trim() || undefined,
      platform: args.platform,
      difficulty: args.difficulty,
      topics: args.topics.slice(0, 3),
      addedBy: user._id,
    });
  },
});

export const list = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, { roomId }) => {
    await requireMember(ctx, roomId);
    const problems = await ctx.db
      .query("problems")
      .withIndex("by_room", (q) => q.eq("roomId", roomId))
      .collect();

    // attach the adder's name
    return await Promise.all(
      problems.map(async (p) => {
        const adder = await ctx.db.get(p.addedBy);
        return { ...p, addedByName: adder?.name ?? "Unknown" };
      })
    );
  },
});