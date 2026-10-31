import { ConvexError, v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import { scrape } from "./knowledge";
import { sopSourceValidator, sopStepValidator } from "./schema";
import { tellTeam } from "./team";
import { claude, getTeam, imageData, requireCoo } from "./util";

type Step = { title: string; detail: string; check: string };
type Draft = { title: string; summary: string; steps: Step[] };

const DRAFT_SYSTEM = `You write a standard operating procedure (SOP) that a new employee can follow, from how their employer described or showed one task. The user turn is JSON: the "source" (voice, text, screen, video or link) and the employer's "words". Images, when attached, are frames of the employer's screen recording or video, in order; "words" is then their narration.
- title: at most 8 words, starting with a verb, like "Handle an invoice price mismatch".
- summary: one short sentence: when to use it and why it matters.
- steps: 4 to 8 steps, in order. Each has a title (at most 8 words, starting with a verb), a detail (1 or 2 short, plain sentences: exactly what to do) and a check (one short sentence: how they know the step is done right).
Use only what the source says or shows. Never invent amounts, systems, names or rules; if something is unclear, keep that step general. Never copy names, emails, account numbers or other personal details from a screen. Plain words a new hire understands, no jargon or markdown.`;

const DRAFT_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    summary: { type: "string" },
    steps: {
      type: "array",
      items: {
        type: "object",
        properties: { title: { type: "string" }, detail: { type: "string" }, check: { type: "string" } },
        required: ["title", "detail", "check"],
        additionalProperties: false,
      },
    },
  },
  required: ["title", "summary", "steps"],
  additionalProperties: false,
};

const clip = (s: string, n: number) => s.trim().slice(0, n);
const cleanSteps = (steps: Step[]) =>
  steps
    .map((s) => ({ title: clip(s.title, 120), detail: clip(s.detail, 600), check: clip(s.check, 300) }))
    .filter((s) => s.title);

const STEP_SYSTEM = `You rewrite one step of an SOP so a new employee with no AI background can follow it. The user turn is JSON with the SOP "title" and the "step" (title, detail, check). Keep the same meaning and order of actions. Never add amounts, systems, names or rules that aren't there.
- title: at most 8 words, starting with a verb.
- detail: 1 or 2 short, plain sentences: exactly what to do.
- check: one short sentence: how they know it's done right.
No jargon, no markdown.`;

const STEP_SCHEMA = DRAFT_SCHEMA.properties.steps.items;

// The employer asks the AI to make one step easier to follow. Nothing is saved.
export const rewriteStep = action({
  args: { title: v.string(), step: sopStepValidator },
  handler: async (ctx, { title, step }): Promise<Step> => {
    await requireCoo(ctx);
    if (!step.title.trim() && !step.detail.trim()) throw new ConvexError("Write the step first.");
    const out = await claude<Step>(STEP_SYSTEM, STEP_SCHEMA, { title: clip(title, 120), step }).catch(() => null);
    if (!out) throw new ConvexError("I couldn't reach the AI just now. Try again.");
    return cleanSteps([out])[0] ?? step;
  },
});

// The employer teaches the AI one task; Claude writes the SOP. Nothing is saved until they hit save.
export const draft = action({
  args: {
    source: sopSourceValidator,
    text: v.optional(v.string()),
    frames: v.optional(v.array(v.string())),
    url: v.optional(v.string()),
  },
  handler: async (ctx, { source, text, frames = [], url }): Promise<Draft> => {
    await requireCoo(ctx);
    let words = text?.trim() ?? "";
    if (source === "link") {
      const page = await scrape(url?.trim() ?? "");
      if (!page.text) throw new ConvexError("That link had no text to learn from.");
      words = [words, page.title, page.text].filter(Boolean).join("\n");
    }
    const visual = source === "screen" || source === "video";
    if (visual && frames.length > 8) throw new ConvexError("Send at most 8 frames.");
    const images = visual ? frames.map(imageData) : [];
    if (!words && !images.length) {
      throw new ConvexError(visual ? "Record or upload the task first." : "Describe the task first.");
    }
    const out = await claude<Draft>(DRAFT_SYSTEM, DRAFT_SCHEMA, { source, words: words.slice(0, 15000) }, images).catch(
      (e: unknown) => {
        console.error("Claude failed to draft an SOP", e instanceof Error ? e.message : e); // never the frames
        throw new ConvexError("I couldn't reach the AI just now. Try again.");
      },
    );
    if (!out) {
      throw new ConvexError(
        process.env.ANTHROPIC_API_KEY ? "I couldn't write that one. Try describing it another way." : "Set ANTHROPIC_API_KEY in Convex first.",
      );
    }
    const steps = cleanSteps(out.steps).slice(0, 8);
    if (!steps.length) throw new ConvexError("I couldn't find steps in that. Try describing it another way.");
    return { title: clip(out.title, 120), summary: clip(out.summary, 500), steps };
  },
});

export const save = mutation({
  args: { title: v.string(), summary: v.string(), steps: v.array(sopStepValidator), source: sopSourceValidator },
  handler: async (ctx, { title, summary, steps, source }) => {
    await requireCoo(ctx);
    const team = await getTeam(ctx);
    const clean = cleanSteps(steps);
    if (!title.trim() || !clean.length || clean.length > 12) throw new ConvexError("An SOP needs a title and 1 to 12 steps.");
    return await ctx.db.insert("sops", {
      teamId: team._id,
      title: clip(title, 120),
      summary: clip(summary, 500),
      steps: clean,
      source,
      published: false,
      createdAt: Date.now(),
    });
  },
});

// Publishing tells every employee: by iMessage, or in the web inbox for web workers.
export const publish = mutation({
  args: { id: v.id("sops") },
  handler: async (ctx, { id }) => {
    await requireCoo(ctx);
    const sop = await ctx.db.get("sops", id);
    if (!sop) throw new ConvexError("That SOP is gone. Refresh the page.");
    if (sop.published) return null;
    await ctx.db.patch("sops", id, { published: true });
    const n = sop.steps.length;
    await tellTeam(ctx, sop.teamId, `New training: ${sop.title} (${n} steps, about ${n} min). Reply START to begin.`);
    return null;
  },
});

// Newest first. Everyone sees published SOPs; the signed-in employer also sees drafts.
// started and completed are totals only, never who.
// shortcut: counts by reading rows; fine for one demo team, use @convex-dev/aggregate for real tenants
export const list = query({
  args: {},
  handler: async (ctx) => {
    const team = await ctx.db.query("teams").first();
    if (!team) return [];
    const employer = (await ctx.auth.getUserIdentity()) !== null;
    const sops = await ctx.db.query("sops").withIndex("by_team", (q) => q.eq("teamId", team._id)).order("desc").take(100);
    return await Promise.all(
      sops
        .filter((s) => employer || s.published)
        .map(async (s) => {
          const t = await ctx.db.query("trainings").withIndex("by_sop", (q) => q.eq("sopId", s._id)).take(1000);
          return {
            _id: s._id,
            title: s.title,
            summary: s.summary,
            steps: s.steps,
            source: s.source,
            published: s.published,
            createdAt: s.createdAt,
            started: t.length,
            completed: t.filter((x) => x.done).length,
          };
        }),
    );
  },
});

export const remove = mutation({
  args: { id: v.id("sops") },
  handler: async (ctx, { id }) => {
    await requireCoo(ctx);
    for await (const t of ctx.db.query("trainings").withIndex("by_sop", (q) => q.eq("sopId", id))) {
      await ctx.db.delete("trainings", t._id);
    }
    if (await ctx.db.get("sops", id)) await ctx.db.delete("sops", id);
    return null;
  },
});
