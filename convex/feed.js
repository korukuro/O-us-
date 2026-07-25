import { query } from "./_generated/server";
import { v } from "convex/values";
import { requireMember } from "./lib/auth";

export const list = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, { roomId }) => {
    const { user } = await requireMember(ctx, roomId);

    // Which problems has THIS caller solved? Their takeaways unlock only these.
    const mySolves = await ctx.db
      .query("solves")
      .withIndex("by_room_user", (q) =>
        q.eq("roomId", roomId).eq("userId", user._id)
      )
      .collect();
    const solvedByMe = new Set(mySolves.map((s) => s.problemId));

    const events = await ctx.db
      .query("events")
      .withIndex("by_room", (q) => q.eq("roomId", roomId))
      .collect();

    return await Promise.all(
      events.map(async (e) => {
        const author = await ctx.db.get(e.userId);

        // reactions → array of { emoji, count }, never emoji-as-key
        const reactionRows = await ctx.db
          .query("reactions")
          .withIndex("by_event", (q) => q.eq("eventId", e._id))
          .collect();

        const byEmoji = new Map();
        for (const r of reactionRows) {
          if (!byEmoji.has(r.emoji)) byEmoji.set(r.emoji, []);
          byEmoji.get(r.emoji).push(r.userId);
        }
        const reactions = [...byEmoji.entries()].map(([emoji, userIds]) => ({
          emoji,
          count: userIds.length,
        }));

        const base = {
          ...e,
          authorName: author?.name ?? "Unknown",
          reactions,
          mineReacted: reactionRows
            .filter((r) => r.userId === user._id)
            .map((r) => r.emoji),
        };

        if (e.problemId) {
          const p = await ctx.db.get(e.problemId);
          base.problemTitle = p?.title;
          base.problemUrl = p?.url;

          if (e.kind === "solve") {
            const solveRow = (
              await ctx.db
                .query("solves")
                .withIndex("by_problem", (q) => q.eq("problemId", e.problemId))
                .collect()
            ).find((s) => s.userId === e.userId);

            const iSolvedThis =
              solvedByMe.has(e.problemId) || e.userId === user._id;

            base.locked = !iSolvedThis;
            base.takeaway = iSolvedThis ? solveRow?.takeaway : undefined;
            base.hasTakeaway = !!solveRow?.takeaway;
          }
        }

        return base;
      })
    );
  },
});