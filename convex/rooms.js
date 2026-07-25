import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUser, requireMember } from "./lib/auth";

// Ambiguous characters removed: no 0/O/1/I
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function makeCode() {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return code;
}

export const create = mutation({
  args: { name: v.string(), sheetName: v.optional(v.string()) },
  handler: async (ctx, { name, sheetName }) => {
    const user = await getCurrentUser(ctx);

    // Generate a code, retry if it collides (rare, but cheap to check)
    let code = makeCode();
    for (let i = 0; i < 5; i++) {
      const clash = await ctx.db
        .query("rooms")
        .withIndex("by_code", (q) => q.eq("code", code))
        .unique();
      if (!clash) break;
      code = makeCode();
    }

    const roomId = await ctx.db.insert("rooms", {
      name,
      code,
      ownerId: user._id,
      sheetName,
    });

    await ctx.db.insert("memberships", {
      roomId,
      userId: user._id,
      xp: 0,
      streak: 0,
      lastDayKey: "",
      freezeTokens: 1,
      role: "owner",
    });

    return { roomId, code };
  },
});

export const join = mutation({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    const user = await getCurrentUser(ctx);
    const room = await ctx.db
      .query("rooms")
      .withIndex("by_code", (q) => q.eq("code", code.toUpperCase().trim()))
      .unique();
    if (!room) throw new Error("No room with that code");

    const existing = await ctx.db
      .query("memberships")
      .withIndex("by_room_user", (q) =>
        q.eq("roomId", room._id).eq("userId", user._id)
      )
      .unique();

    if (existing) {
      // Rejoin if they'd left before
      if (existing.leftAt) await ctx.db.patch(existing._id, { leftAt: undefined });
      return room._id;
    }

    await ctx.db.insert("memberships", {
      roomId: room._id,
      userId: user._id,
      xp: 0,
      streak: 0,
      lastDayKey: "",
      freezeTokens: 1,
      role: "member",
    });
    return room._id;
  },
});

export const myRooms = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const active = memberships.filter((m) => !m.leftAt);
    const rooms = await Promise.all(
      active.map(async (m) => {
        const room = await ctx.db.get(m.roomId);
        return room ? { ...room, myXp: m.xp, myStreak: m.streak } : null;
      })
    );
    return rooms.filter(Boolean);
  },
});

export const members = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, { roomId }) => {
    await requireMember(ctx, roomId); // gate: only members can see the roster
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_room", (q) => q.eq("roomId", roomId))
      .collect();

    return await Promise.all(
      memberships
        .filter((m) => !m.leftAt)
        .map(async (m) => {
          const u = await ctx.db.get(m.userId);
          return {
            userId: m.userId,
            name: u?.name ?? "Unknown",
            avatar: u?.avatar ?? "",
            xp: m.xp,
            streak: m.streak,
            role: m.role,
          };
        })
    );
  },
});