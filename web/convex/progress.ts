import { v } from "convex/values";
import { query } from "./_generated/server";
import { progressOf } from "./paths";

// The web worker's own progress. Keyed by their private device id, like outbox.webInbox.
export const mine = query({
  args: { deviceId: v.string() },
  handler: async (ctx, { deviceId }) => {
    const w = await ctx.db.query("workers").withIndex("by_phone", (q) => q.eq("phone", `web:${deviceId}`)).unique();
    if (!w) return null;
    const logs = await ctx.db.query("logs").withIndex("by_worker", (q) => q.eq("workerId", w._id)).take(500);
    return progressOf(w, logs);
  },
});
