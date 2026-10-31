import Anthropic from "@anthropic-ai/sdk";
import type { GenericDatabaseReader, GenericDataModel } from "convex/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { action, query, type QueryCtx } from "./_generated/server";
import { PATHS, pathOf, progressOf } from "./paths";
import schema from "./schema";

const byDevice = (ctx: QueryCtx, deviceId: string) =>
  ctx.db.query("workers").withIndex("by_phone", (q) => q.eq("phone", `web:${deviceId}`)).unique();

// The web worker's own progress. Keyed by their private device id, like outbox.webInbox.
export const mine = query({
  args: { deviceId: v.string() },
  handler: async (ctx, { deviceId }) => {
    const w = await byDevice(ctx, deviceId);
    if (!w) return null;
    const logs = await ctx.db.query("logs").withIndex("by_worker", (q) => q.eq("workerId", w._id)).take(500);
    return progressOf(w, logs);
  },
});

// Game points. Pure, so tests/progress.test.ts can check them.
export const LEVEL_XP = 100;
export function xpOf(n: { logs: number; practiced: number; plans: number; learned: number }) {
  const xp = n.logs * 10 + n.practiced * 25 + n.plans * 40 + n.learned * 30;
  const level = Math.floor(xp / LEVEL_XP) + 1;
  return { xp, level, nextLevelXp: level * LEVEL_XP };
}

// On track: halfway along their path, or learned at least one team workflow. The employer only sees the count.
export function isOnTrack(w: { track?: "transition" | "newhire"; step?: number; skills?: string[] }, published: string[]) {
  const { track, step } = pathOf(w);
  return step >= PATHS[track].length / 2 || (w.skills ?? []).some((s) => published.includes(s));
}

// SOP knowledge is optional: read it only while the knowledge table is in the schema.
async function sopTitles(ctx: QueryCtx, teamId: Id<"teams">): Promise<string[]> {
  if (!("knowledge" in schema.tables)) return [];
  const db = ctx.db as unknown as GenericDatabaseReader<GenericDataModel>;
  const docs = await db.query("knowledge").withIndex("by_team", (q) => q.eq("teamId", teamId)).take(20);
  return docs.map((d) => d.title).filter((t): t is string => typeof t === "string");
}

// The worker's private dashboard: what they still lack, measured against the team's own workflows and SOPs.
export const dashboard = query({
  args: { deviceId: v.string() },
  handler: (ctx, { deviceId }) => dashboardOf(ctx, deviceId),
});

// A plain function so suggest can name its type without a circular reference through api.
async function dashboardOf(ctx: QueryCtx, deviceId: string) {
  const w = await byDevice(ctx, deviceId);
  if (!w) return null;
  const logs = await ctx.db.query("logs").withIndex("by_worker", (q) => q.eq("workerId", w._id)).take(500);
  const playbooks = await ctx.db.query("playbooks").withIndex("by_team", (q) => q.eq("teamId", w.teamId)).take(200);
  const published = playbooks.filter((p) => p.published);
  const skills = w.skills ?? [];
  const learned = published.filter((p) => skills.includes(p.title)).length;
  const counts = { logs: logs.length, practiced: w.practiced ?? 0, plans: w.planAt === undefined ? 0 : 1, learned };
  const gaps = [
    ...published
      .filter((p) => !skills.includes(p.title))
      .map((p) => ({ title: p.title, kind: "playbook" as const, category: p.category })),
    ...(await sopTitles(ctx, w.teamId))
      .filter((t) => !skills.includes(t))
      .map((title) => ({ title, kind: "sop" as const, category: "Team SOP" })),
  ];
  return {
    ...xpOf(counts),
    ...progressOf(w, logs),
    badges: [
      { name: "First log", earned: counts.logs > 0 },
      { name: "First practice", earned: counts.practiced > 0 },
      { name: "Has a plan", earned: counts.plans > 0 },
      { name: "Shared a shortcut", earned: playbooks.some((p) => p.originatorId === w._id) },
      { name: "Learned a team workflow", earned: learned > 0 },
    ],
    gaps: gaps.slice(0, 8),
    onTrack: isOnTrack(w, published.map((p) => p.title)),
  };
}
type Dashboard = NonNullable<Awaited<ReturnType<typeof dashboardOf>>>;

const SCHEMA = {
  type: "object",
  properties: { suggestions: { type: "array", items: { type: "string" } } },
  required: ["suggestions"],
  additionalProperties: false,
};

const SYSTEM = `You suggest next steps for one accounts-payable worker who is bringing AI into their work. The user turn is JSON: their own work logs, their coach's notes, the skills they practiced, and the team workflows and SOPs they have not learned yet ("teamWays").
Give 2 or 3 suggestions. Each one is one concrete change to how they work that fits the team's workflows and SOPs.
- Plain, short words. At most 140 characters each.
- Prefer a team workflow or SOP that matches a task they logged.
- A person always checks numbers, approvals and vendor relationships.
- No AI jargon (model, prompt, token). No names of people, clients or vendors.`;

// 2-3 short workflow tweaks from the worker's own data and the team's ways of working. Nothing is stored.
// shortcut: no rate limit on this public action; add @convex-dev/rate-limiter before real users
export const suggest = action({
  args: { deviceId: v.string() },
  handler: async (ctx, { deviceId }): Promise<string[]> => {
    if (!/^[\w-]{8,64}$/.test(deviceId)) return [];
    const d: Dashboard | null = await ctx.runQuery(api.progress.dashboard, { deviceId });
    if (!d) return [];
    const me = await ctx.runQuery(internal.workers.mine, { phone: `web:${deviceId}` });
    const input = {
      logs: me.logs.slice(0, 15).map(({ task, category, tool, minutesPerWeek, keepHuman }) => ({
        task, category, tool, minutesPerWeek, keepHuman,
      })),
      notes: me.memory,
      skills: d.skills,
      teamWays: d.gaps.map(({ title, kind }) => ({ title, kind })),
    };
    const ai = await claude(input).catch((e) => {
      console.error("Claude failed, using the suggestion template", e);
      return null;
    });
    const out = ai?.suggestions.map((s) => s.trim()).filter((s) => s && s.length <= 140).slice(0, 3) ?? [];
    return out.length >= 2 ? out : template(d.gaps, d.badges, me.logs);
  },
});

// Same call shape as ingest.ts's helper: one structured Claude call, or null without a key or on refusal.
async function claude(user: unknown): Promise<{ suggestions: string[] } | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  const res = await new Anthropic().beta.messages.create({
    model: "claude-opus-5-5",
    max_tokens: 1000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
    system: SYSTEM,
    messages: [{ role: "user", content: JSON.stringify(user) }],
  });
  const block = res.content.find((b) => b.type === "text");
  if (res.stop_reason === "refusal" || block?.type !== "text") return null;
  return JSON.parse(block.text) as { suggestions: string[] };
}

// Without Claude: the first gaps in their own path, then safe habits. Titles and tasks are capped at 80 characters.
export function template(
  gaps: { title: string }[],
  badges: { name: string; earned: boolean }[],
  logs: { task: string; keepHuman: boolean }[],
): string[] {
  const has = (name: string) => badges.some((b) => b.name === name && b.earned);
  const gap = gaps[0]?.title.slice(0, 80);
  const task = logs.find((l) => !l.keepHuman)?.task.slice(0, 80);
  return [
    gap && `Learn the team way: ${gap}. Practice it once in the chat.`,
    !has("First log") && "Tell the coach one task that eats your time. It finds where AI fits.",
    task && !has("First practice") && `Let AI do a first pass on "${task}", then check it yourself.`,
    !has("Has a plan") && "Ask the coach for your plan. It picks where AI saves you time first.",
    "Check every number yourself before anything is sent or paid.",
    "Found a shortcut that works? Share it so your team can learn it. Your name stays private.",
  ]
    .filter((s): s is string => !!s)
    .slice(0, 3);
}
