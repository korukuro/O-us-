"use node";

import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import webpush from "web-push";

function configure() {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

async function deliver(ctx, userId, title, body, url) {
  const subs = await ctx.runQuery(internal.subscriptions.getSubsForUser, { userId });
  const payload = JSON.stringify({ title, body, url: url || "/" });
  for (const row of subs) {
    try {
      await webpush.sendNotification(JSON.parse(row.subscription), payload);
    } catch (err) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        await ctx.runMutation(internal.subscriptions.deleteSub, { id: row._id });
      } else {
        console.error("push send failed", err.statusCode, err.body);
      }
    }
  }
}

// public — called from the client (dare throw)
export const sendToUser = action({
  args: { userId: v.id("users"), title: v.string(), body: v.string(), url: v.optional(v.string()) },
  handler: async (ctx, { userId, title, body, url }) => {
    configure();
    await deliver(ctx, userId, title, body, url);
  },
});

// internal — called by the scheduler (dare accept)
export const sendToUserInternal = internalAction({
  args: { userId: v.id("users"), title: v.string(), body: v.string(), url: v.optional(v.string()) },
  handler: async (ctx, { userId, title, body, url }) => {
    configure();
    await deliver(ctx, userId, title, body, url);
  },
});

// internal — called by the cron
export const nudgeIncomplete = internalAction({
  handler: async (ctx) => {
    configure();
    const targets = await ctx.runQuery(internal.subscriptions.usersWithIncompletePlans);
    for (const userId of targets) {
      await deliver(
        ctx,
        userId,
        "Plan's still open ⏳",
        "You locked a plan today but haven't cleared it. Complexity degrading."
      );
    }
  },
});