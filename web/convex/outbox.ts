import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { assertAgent } from "./util";

export const pending = query({
  args: { secret: v.string() },
  handler: async (ctx, { secret }) => {
    assertAgent(secret);
    const rows = await ctx.db.query("outbox").withIndex("by_sent", (q) => q.eq("sent", false)).take(50);
    return rows.map(({ _id, to, body }) => ({ _id, to, body }));
  },
});

// The web fallback's inbox: receipts addressed to web:<deviceId> show up live in the browser chat.
export const webInbox = query({
  args: { deviceId: v.string() },
  handler: async (ctx, { deviceId }) => {
    const rows = await ctx.db.query("outbox").withIndex("by_to", (q) => q.eq("to", `web:${deviceId}`)).take(20);
    return rows.map(({ _id, _creationTime, body }) => ({ _id, at: _creationTime, body }));
  },
});

export const markSent = mutation({
  args: { secret: v.string(), id: v.id("outbox") },
  handler: async (ctx, { secret, id }) => {
    assertAgent(secret);
    await ctx.db.patch("outbox", id, { sent: true });
    return null;
  },
});
