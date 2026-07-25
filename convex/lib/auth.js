// Shared authorization helpers. Every room-scoped function starts with one of these.

export async function getCurrentUser(ctx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not signed in");
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
    .unique();
  if (!user) throw new Error("No user record");
  return user;
}

export async function requireMember(ctx, roomId) {
  const user = await getCurrentUser(ctx);
  const membership = await ctx.db
    .query("memberships")
    .withIndex("by_room_user", (q) =>
      q.eq("roomId", roomId).eq("userId", user._id)
    )
    .unique();
  if (!membership || membership.leftAt) {
    throw new Error("Not a member of this room");
  }
  return { user, membership };
}