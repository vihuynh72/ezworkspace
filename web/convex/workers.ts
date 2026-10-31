import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { internalMutation, internalQuery, type MutationCtx } from "./_generated/server";
import { sealed, teamMap } from "./lib";
import { nextStep, pathOf, type Done } from "./paths";
import { trackValidator } from "./schema";
import { getTeam, teamCompact, teamLogs, teamWorkers } from "./util";

// Finds the worker by phone, or adds them: their first text makes them a voice.
export async function join(ctx: MutationCtx, phone: string) {
  const found = await ctx.db.query("workers").withIndex("by_phone", (q) => q.eq("phone", phone)).unique();
  if (found) return found;
  const team = await getTeam(ctx);
  return (await ctx.db.get("workers", await ctx.db.insert("workers", { teamId: team._id, phone, seeded: false })))!;
}

// Moves the worker one step along their path when this turn finishes the current step.
async function advance(ctx: MutationCtx, w: Doc<"workers"> | null, done: Done | null, patch: Partial<Doc<"workers">> = {}) {
  const { track, step: from } = pathOf(w);
  const step = nextStep(track, from, done);
  if (w) await ctx.db.patch("workers", w._id, { ...patch, track, step });
  return { track, step, advanced: step > from };
}

// Saves one work log privately and moves the path on. Only ingest calls this.
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
  handler: async (ctx, { phone, isWork, ...log }) => {
    const w = await join(ctx, phone);
    if (isWork) await ctx.db.insert("logs", { teamId: w.teamId, workerId: w._id, ...log, task: log.task.slice(0, 80) });
    return advance(ctx, w, isWork ? "log" : null);
  },
});

// Everything the coach knows about one worker: their own logs and path, plus team totals. Only ingest calls this.
export const mine = internalQuery({
  args: { phone: v.string() },
  handler: async (ctx, { phone }) => {
    const team = await getTeam(ctx);
    const worker = await ctx.db.query("workers").withIndex("by_phone", (q) => q.eq("phone", phone)).unique();
    const logs = worker
      ? await ctx.db.query("logs").withIndex("by_worker", (q) => q.eq("workerId", worker._id)).order("desc").take(50)
      : [];
    const signed = (await teamCompact(ctx, team._id)) !== null;
    const voices = (await teamWorkers(ctx, team._id)).length;
    // How the team uses AI, for new hires: the same aggregates the employer sees, so nothing while sealed.
    const map = sealed(voices, team.quorum, signed) ? null : teamMap(await teamLogs(ctx, team._id));
    const playbooks = await ctx.db.query("playbooks").withIndex("by_team", (q) => q.eq("teamId", team._id)).take(200);
    const skills = worker?.skills ?? [];
    // Their newest shortcut they came up with, unless they already shared it.
    const own = logs.find((l) => l.originator && !l.keepHuman);
    const shared = own && playbooks.some((p) => p.originatorId === own.workerId && p._creationTime > own._creationTime);
    const workflow = playbooks.filter((p) => p.published && !skills.includes(p.title)).at(-1);
    return {
      workerId: worker?._id ?? null,
      mode: worker?.mode ?? null,
      ...pathOf(worker),
      team: `${team.company} ${team.name}`,
      signed,
      voices,
      quorum: team.quorum,
      memory: worker?.memory ?? null,
      skills,
      logs: logs.map(({ task, category, tool, minutesPerWeek, keepHuman, originator }) => ({
        task, category, tool, minutesPerWeek, keepHuman, originator,
      })),
      playbook: map && {
        ai: map.categories.filter((c) => c.hoursPerWeek > 0).slice(0, 3).map((c) => c.category),
        keep: map.keepList.slice(0, 3),
      },
      workflow: workflow ? { title: workflow.title, category: workflow.category, steps: workflow.steps } : null,
      shareable: own && !shared ? { task: own.task, category: own.category, tool: own.tool } : null,
    };
  },
});

// Saying you're new switches to the new-hire path; the same path resumes where it was.
export const begin = internalMutation({
  args: { phone: v.string(), track: v.optional(trackValidator) },
  handler: async (ctx, { phone, track }) => {
    const w = await join(ctx, phone);
    if (track && track !== pathOf(w).track) {
      await ctx.db.patch("workers", w._id, { track, step: 1 });
      return { workerId: w._id, track, step: 1 };
    }
    return { workerId: w._id, ...pathOf(w) };
  },
});

export const markPlan = internalMutation({
  args: { workerId: v.id("workers") },
  handler: async (ctx, { workerId }) =>
    advance(ctx, await ctx.db.get("workers", workerId), "plan", { planAt: Date.now() }),
});

// "TRY": the worker's next text is a practice example.
export const startTry = internalMutation({
  args: { workerId: v.id("workers") },
  handler: async (ctx, { workerId }) => {
    await ctx.db.patch("workers", workerId, { mode: "try" });
    return null;
  },
});

// Ends a TRY session. Only the count and the task's name are kept, never the example.
// Practicing a published team workflow's category counts the worker as one adopter, once.
export const endTry = internalMutation({
  args: { workerId: v.id("workers"), practiced: v.boolean(), skill: v.optional(v.string()), category: v.optional(v.string()) },
  handler: async (ctx, { workerId, practiced, skill, category }) => {
    const w = await ctx.db.get("workers", workerId);
    let skills = w?.skills ?? [];
    if (w && practiced && skill) {
      const pb = (await ctx.db.query("playbooks").withIndex("by_team", (q) => q.eq("teamId", w.teamId)).take(200))
        .filter((p) => p.published && p.category === category)
        .at(-1);
      if (pb && !skills.includes(pb.title)) await ctx.db.patch("playbooks", pb._id, { adopters: pb.adopters + 1 });
      const learned = pb?.title ?? skill.slice(0, 80);
      skills = [...skills.filter((s) => s !== learned), learned].slice(-5);
    }
    return advance(ctx, w, practiced ? "try" : null, {
      mode: undefined,
      practiced: (w?.practiced ?? 0) + (practiced ? 1 : 0),
      skills,
    });
  },
});

// The coach's private notes on one worker, rewritten each turn. Only their own prompts read it.
export const remember = internalMutation({
  args: { workerId: v.id("workers"), memory: v.string() },
  handler: async (ctx, { workerId, memory }) => {
    if (await ctx.db.get("workers", workerId)) await ctx.db.patch("workers", workerId, { memory: memory.slice(0, 600) });
    return null;
  },
});

// SHARE: the worker's shortcut becomes a draft team workflow. Their name never goes with it.
export const share = internalMutation({
  args: { workerId: v.id("workers"), title: v.string(), category: v.string(), steps: v.array(v.string()) },
  handler: async (ctx, { workerId, ...pb }) => {
    const w = await ctx.db.get("workers", workerId);
    if (w) {
      await ctx.db.insert("playbooks", {
        teamId: w.teamId, ...pb, source: "worker", originatorId: workerId, adopters: 0, published: false,
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

// "DELETE": the worker's logs, memory, membership and pending texts are erased.
export const forget = internalMutation({
  args: { phone: v.string() },
  handler: async (ctx, { phone }) => {
    const worker = await ctx.db.query("workers").withIndex("by_phone", (q) => q.eq("phone", phone)).unique();
    if (worker) {
      for await (const log of ctx.db.query("logs").withIndex("by_worker", (q) => q.eq("workerId", worker._id))) {
        await ctx.db.delete("logs", log._id);
      }
      // Drafts they shared go too; a published team workflow stays, with no link back to them.
      for await (const pb of ctx.db.query("playbooks").withIndex("by_team", (q) => q.eq("teamId", worker.teamId))) {
        if (pb.originatorId !== worker._id) continue;
        if (pb.published) await ctx.db.patch("playbooks", pb._id, { originatorId: undefined });
        else await ctx.db.delete("playbooks", pb._id);
      }
      for await (const t of ctx.db.query("trainings").withIndex("by_worker", (q) => q.eq("workerId", worker._id))) {
        await ctx.db.delete("trainings", t._id);
      }
      await ctx.db.delete("workers", worker._id); // memory and skills go with it
    }
    for await (const msg of ctx.db.query("outbox").withIndex("by_to", (q) => q.eq("to", phone))) {
      await ctx.db.delete("outbox", msg._id);
    }
    return null;
  },
});
