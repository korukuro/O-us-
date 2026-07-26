import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireMember } from "./lib/auth";
import { dayKeyFor, dayGap } from "./lib/dates";

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

    // Is this a first solve or a revisit?
    const priorSolves = await ctx.db
      .query("solves")
      .withIndex("by_room_user", (q) =>
        q.eq("roomId", roomId).eq("userId", user._id)
      )
      .collect();
    const existing = priorSolves.find((s) => s.problemId === problemId);
    const isRevisit = !!existing;

    const dayKey = dayKeyFor(user.tz);
    let gained = 0;

    if (isRevisit) {
      // update the existing solve's takeaway; no new row, no XP
      if (takeaway?.trim()) {
        await ctx.db.patch(existing._id, { takeaway: takeaway.trim() });
      }
      // a lighter "revisited" event, doesn't count as a fresh solve
      await ctx.db.insert("events", {
        roomId,
        userId: user._id,
        kind: "system",
        body: `${user.name} revisited ${problem.title}.`,
        dayKey,
      });
    } else {
      // first solve: the real row, XP, and a solve event
      await ctx.db.insert("solves", {
        roomId,
        problemId,
        userId: user._id,
        takeaway: takeaway?.trim() || undefined,
        dayKey,
      });
      gained = XP[problem.difficulty] ?? 0;
      await ctx.db.patch(membership._id, { xp: membership.xp + gained });
      await ctx.db.insert("events", {
        roomId,
        userId: user._id,
        kind: "solve",
        problemId,
        difficulty: problem.difficulty,
        dayKey,
      });
    }

    // 4. streak evaluation: did this solve just complete a locked plan?
    const todaysPlans = await ctx.db
      .query("plans")
      .withIndex("by_user_day", (q) =>
        q.eq("userId", user._id).eq("dayKey", dayKey)
      )
      .collect();
    const plan = todaysPlans.find((p) => p.roomId === roomId);

    if (plan?.lockedAt) {
      // recount solves now that this one is in
      const solvesNow = await ctx.db
        .query("solves")
        .withIndex("by_room_user", (q) =>
          q.eq("roomId", roomId).eq("userId", user._id)
        )
        .collect();
      const solvedIds = new Set(solvesNow.map((s) => s.problemId));
      const doneCount = plan.problemIds.filter((id) => solvedIds.has(id)).length;
      const justCompleted = doneCount === plan.problemIds.length;

      const alreadyCountedToday = membership.lastDayKey === dayKey;
      if (justCompleted && !alreadyCountedToday) {
        const gap = dayGap(membership.lastDayKey, dayKey);
        let streak = membership.streak;
        let freezeTokens = membership.freezeTokens;

        if (gap === 1) {
          streak += 1; // consecutive day
        } else if (gap === Infinity) {
          streak = 1; // first ever completion
        } else if (gap > 1) {
          if (freezeTokens > 0) {
            freezeTokens -= 1; // a freeze saves the streak
            streak += 1;
          } else {
            streak = 1; // missed day, no token → reset
          }
        }

        await ctx.db.patch(membership._id, {
          streak,
          freezeTokens,
          lastDayKey: dayKey,
        });

        await ctx.db.insert("events", {
          roomId,
          userId: user._id,
          kind: "system",
          body: `${user.name} cleared a plan of ${plan.problemIds.length}. Streak: ${streak}.`,
          dayKey,
        });
      }
    }

    return { gained };
  },
});

export const sendMessage = mutation({
  args: { roomId: v.id("rooms"), body: v.string(), replyTo: v.optional(v.id("events")) },
  handler: async (ctx, { roomId, body, replyTo }) => {
    const { user } = await requireMember(ctx, roomId);
    if (!body.trim()) throw new Error("Empty message");
    await ctx.db.insert("events", {
      roomId,
      userId: user._id,
      kind: "text",
      body: body.trim(),
      replyTo: replyTo || undefined,
      dayKey: dayKeyFor(user.tz),
    });
  },
});