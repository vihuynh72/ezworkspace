import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { DIVIDEND_PCT } from "./lib";
import { getTeam, teamCompact, teamWorkers } from "./util";

// Saves one text as a private log and returns the reply. Only ingest.text calls this.
export const store = internalMutation({
  args: {
    phone: v.string(),
    isWork: v.boolean(),
    task: v.string(),
    category: v.string(),
    tool: v.union(v.string(), v.null()),
    minutesPerWeek: v.number(),
    keepHuman: v.boolean(),
    originator: v.boolean(),
  },
  handler: async (ctx, { phone, isWork, ...log }): Promise<string> => {
    const team = await getTeam(ctx);
    const existing = await ctx.db.query("workers").withIndex("by_phone", (q) => q.eq("phone", phone)).unique();
    const workerId = existing?._id ?? (await ctx.db.insert("workers", { teamId: team._id, phone, seeded: false }));
    if (isWork) await ctx.db.insert("logs", { teamId: team._id, workerId, ...log, task: log.task.slice(0, 80) });

    const voices = (await teamWorkers(ctx, team._id)).length;
    const signed = (await teamCompact(ctx, team._id)) !== null;
    const status =
      voices < team.quorum
        ? `Team: ${voices}/${team.quorum} voices. Your team's map stays sealed until ${team.quorum - voices} more join.`
        : !signed
          ? `Team: ${voices}/${team.quorum} voices, quorum reached. The map stays sealed until ${team.company} signs the Compact, which pays you ${DIVIDEND_PCT}% of what AI saves.`
          : `${team.company} has signed the Compact. Your dividend grows as your team logs more.`;

    if (!isWork) {
      return (
        `Hi! This is ezworkspace, your private AI transition coach at ${team.company}.\n\n` +
        `Will this be used to cut your job? No. Under the ezworkspace Compact nobody ends up worse off: ` +
        `no pay cuts or AI layoffs for 12 months, and ${DIVIDEND_PCT}% of what AI saves goes to the people who found it.\n\n` +
        `Tell me one thing you do every week and whether AI helps with it, like ` +
        `"ChatGPT drafts my vendor emails, saves 2 hours a week." Only you see what you send.\n\n${status}`
      );
    }
    const hrs = Math.round(log.minutesPerWeek / 6) / 10;
    const detail = log.keepHuman
      ? `Marked keep-human: "${log.task}" stays yours.`
      : `"${log.task}": about ${hrs} hrs/week${log.tool ? ` with ${log.tool}` : ""}.` +
        (log.originator ? " You're credited as the originator of this shortcut." : "");
    return (
      `Saved privately. Only you can see this.\n\n${detail}\n\n${status}\n` +
      `Text PLAN for your personal transition plan, or DELETE to erase everything.`
    );
  },
});

// A worker's own logs, for their private transition plan. Only ingest.text calls this.
export const mine = internalQuery({
  args: { phone: v.string() },
  handler: async (ctx, { phone }) => {
    const team = await getTeam(ctx);
    const worker = await ctx.db.query("workers").withIndex("by_phone", (q) => q.eq("phone", phone)).unique();
    const logs = worker
      ? await ctx.db.query("logs").withIndex("by_worker", (q) => q.eq("workerId", worker._id)).take(50)
      : [];
    const signed = (await teamCompact(ctx, team._id)) !== null;
    return {
      workerId: worker?._id ?? null,
      mode: worker?.mode ?? null,
      team: `${team.company} ${team.name}`,
      signed,
      voices: (await teamWorkers(ctx, team._id)).length,
      quorum: team.quorum,
      logs: logs.map(({ task, category, tool, minutesPerWeek, keepHuman }) => ({ task, category, tool, minutesPerWeek, keepHuman })),
    };
  },
});

export const markPlan = internalMutation({
  args: { workerId: v.id("workers") },
  handler: async (ctx, { workerId }) => {
    await ctx.db.patch("workers", workerId, { planAt: Date.now() });
    return null;
  },
});

// "TRY": the worker's next text is a practice example.
export const startTry = internalMutation({
  args: { workerId: v.id("workers") },
  handler: async (ctx, { workerId }) => {
    await ctx.db.patch("workers", workerId, { mode: "try" });
    return null;
  },
});

// Ends a TRY session. Only the count is kept, never the example.
export const endTry = internalMutation({
  args: { workerId: v.id("workers"), practiced: v.boolean() },
  handler: async (ctx, { workerId, practiced }) => {
    const worker = await ctx.db.get("workers", workerId);
    if (worker) {
      await ctx.db.patch("workers", workerId, {
        mode: undefined,
        practiced: (worker.practiced ?? 0) + (practiced ? 1 : 0),
      });
    }
    return null;
  },
});

// Voice notes are only for people who already joined, so voice.speak isn't an open text-to-speech proxy.
export const exists = internalQuery({
  args: { phone: v.string() },
  handler: async (ctx, { phone }) =>
    (await ctx.db.query("workers").withIndex("by_phone", (q) => q.eq("phone", phone)).unique()) !== null,
});

// "DELETE": the worker's logs, membership and pending texts are erased.
export const forget = internalMutation({
  args: { phone: v.string() },
  handler: async (ctx, { phone }) => {
    const worker = await ctx.db.query("workers").withIndex("by_phone", (q) => q.eq("phone", phone)).unique();
    if (worker) {
      for await (const log of ctx.db.query("logs").withIndex("by_worker", (q) => q.eq("workerId", worker._id))) {
        await ctx.db.delete("logs", log._id);
      }
      await ctx.db.delete("workers", worker._id);
    }
    for await (const msg of ctx.db.query("outbox").withIndex("by_to", (q) => q.eq("to", phone))) {
      await ctx.db.delete("outbox", msg._id);
    }
    return null;
  },
});
