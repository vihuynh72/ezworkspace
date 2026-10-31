import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { action, internalMutation, internalQuery, query, type ActionCtx } from "./_generated/server";
import { claude, imageData } from "./util";
import { join } from "./workers";

type Sop = Pick<Doc<"sops">, "title" | "summary" | "steps">;
export type Turn = { reply: string; step: number; total: number; done: boolean };
type Opened = { _id: Id<"trainings">; step: number; done: boolean; fresh: boolean; sop: Sop };

const HINT = "Say done when you finish, or ask me anything.";

// Speech-to-text adds case and punctuation, so "Done." and "I did it!" both count. A question never does.
const DONE = /^(?:(?:ok|okay|yes|yep|alright) )?(?:done|all done|finished|did it|i did it|i'?m done|i am done|i'?ve done it|i finished|next|next step)(?: now)?$/;
export const isDone = (message: string) =>
  DONE.test(message.toLowerCase().replace(/[^a-z' ]+/g, " ").replace(/\s+/g, " ").trim());

export const stepLine = (sop: Sop, step: number) => {
  const s = sop.steps[step - 1];
  return `Step ${step} of ${sop.steps.length}: ${s.title.replace(/[.!?\s]+$/, "")}. ${s.detail} Check: ${s.check}`;
};

// Web: one turn of voice-first training. The screen frame goes to Claude once and is never stored.
// shortcut: no rate limit on this public action; add @convex-dev/rate-limiter before real users
export const say = action({
  args: { deviceId: v.string(), sopId: v.id("sops"), message: v.optional(v.string()), frameBase64: v.optional(v.string()) },
  handler: async (ctx, { deviceId, sopId, message, frameBase64 }): Promise<Turn> => {
    if (!/^[\w-]{8,64}$/.test(deviceId)) throw new ConvexError("This browser has no device id. Refresh the page.");
    if (message && message.length > 2000) throw new ConvexError("Keep messages under 2000 characters.");
    return await turn(ctx, `web:${deviceId}`, sopId, message ?? "", frameBase64);
  },
});

// One training turn, the same on the web and on iMessage: no message shows the current step,
// "done" (or a screen that shows it done) moves on, and a question gets an answer from the SOP.
export async function turn(ctx: ActionCtx, phone: string, sopId: Id<"sops">, message: string, frame?: string): Promise<Turn> {
  const image = frame ? imageData(frame) : undefined;
  const t: Opened = await ctx.runMutation(internal.training.open, { phone, sopId });
  const total = t.sop.steps.length;
  const learned = `"${t.sop.title}" is on your skills list now.`;
  if (t.done) return { reply: `You finished "${t.sop.title}". ${learned}`, step: total, total, done: true };
  const msg = message.trim();
  if (!msg && !image) {
    const intro = t.fresh ? `Let's learn "${t.sop.title}": ${total} steps, about ${total} minutes.` : "";
    return { reply: [intro, stepLine(t.sop, t.step), HINT].filter(Boolean).join(" "), step: t.step, total, done: false };
  }
  const ai = await coachStep(t.sop, t.step, msg, image).catch((e) => {
    console.error("Claude failed, using the SOP text", e instanceof Error ? e.message : e); // never the frame
    return null;
  });
  if (!isDone(msg) && !ai?.done) {
    const reply = ai?.reply || `${image ? "I can't check your screen right now." : "Here's this step again."} ${stepLine(t.sop, t.step)} ${HINT}`;
    return { reply, step: t.step, total, done: false };
  }
  const next: { step: number; done: boolean } = await ctx.runMutation(internal.training.advance, { trainingId: t._id, from: t.step });
  if (next.done) {
    return { reply: `${ai?.done ? ai.reply : `You finished "${t.sop.title}"! Great work.`} ${learned}`, step: total, total, done: true };
  }
  return { reply: ai?.done ? ai.reply : `Nice work. ${stepLine(t.sop, next.step)}`, step: next.step, total, done: false };
}

const COACH = `You are ezworkspace, a kind trainer. You teach one employee their company's way of doing a task, one step at a time, using only the SOP you're given. Your reply may be read aloud.
The user turn is JSON: the "sop", "step" (the step they are on), "next" (the step after it, or null if this is the last), and their "message". An attached image is their screen right now, shared only for this check.
done: true only if they say they finished the current step ("done", "I did it", "finished") or the screen clearly shows the current step done. A question, a doubt or "not yet" is false.
reply: plain spoken words. No lists, markdown or emojis.
- done and "next" is set: a few words of praise, then teach "next" in at most 2 short sentences, then "Check: " and its check.
- done and "next" is null: congratulate them on finishing, in 1 short sentence.
- not done, a question: answer it from the SOP in at most 2 short sentences, then remind them of the current step's check. If the SOP doesn't cover it, say so and suggest asking their lead.
- not done, a screen: say what is still missing for this step, in at most 2 short sentences, then its check.
Never invent rules, amounts or systems. Never repeat names, emails, account numbers, amounts or other personal details from a screen. This training is for their growth, never to judge them.`;

const COACH_SCHEMA = {
  type: "object",
  properties: { done: { type: "boolean" }, reply: { type: "string" } },
  required: ["done", "reply"],
  additionalProperties: false,
};

async function coachStep(sop: Sop, step: number, message: string, image?: string) {
  const out = await claude<{ done: boolean; reply: string }>(
    COACH,
    COACH_SCHEMA,
    {
      sop,
      step: { number: step, of: sop.steps.length, ...sop.steps[step - 1] },
      next: sop.steps[step] ?? null,
      message: message || "Check my screen.",
    },
    image ? [image] : [],
  );
  return out && { done: out.done, reply: out.reply.trim() };
}

// The browser's own progress on each training, for the Training list. Keyed by device id, like say.
export const mine = query({
  args: { deviceId: v.string() },
  handler: async (ctx, { deviceId }) => {
    if (!/^[\w-]{8,64}$/.test(deviceId)) return [];
    const w = await ctx.db.query("workers").withIndex("by_phone", (q) => q.eq("phone", `web:${deviceId}`)).unique();
    if (!w) return [];
    const rows = await ctx.db.query("trainings").withIndex("by_worker", (q) => q.eq("workerId", w._id)).take(100);
    return await Promise.all(
      rows.map(async (r) => ({
        sopId: r.sopId,
        step: r.step,
        total: (await ctx.db.get("sops", r.sopId))?.steps.length ?? 0,
        done: r.done,
      })),
    );
  },
});

// Finds or starts this worker's training on a published SOP; leaving it with EXIT is undone here.
export const open = internalMutation({
  args: { phone: v.string(), sopId: v.id("sops") },
  handler: async (ctx, { phone, sopId }): Promise<Opened> => {
    const sop = await ctx.db.get("sops", sopId);
    if (!sop?.published) throw new ConvexError("That training isn't available. Refresh the page.");
    const w = await join(ctx, phone);
    const rows = await ctx.db.query("trainings").withIndex("by_worker", (q) => q.eq("workerId", w._id)).take(100);
    let t = rows.find((r) => r.sopId === sopId);
    const fresh = !t;
    if (!t) {
      const id = await ctx.db.insert("trainings", { workerId: w._id, sopId, step: 1, done: false, startedAt: Date.now() });
      t = (await ctx.db.get("trainings", id))!;
    } else if (t.paused) {
      await ctx.db.patch("trainings", t._id, { paused: undefined });
    }
    return { _id: t._id, step: t.step, done: t.done, fresh, sop: { title: sop.title, summary: sop.summary, steps: sop.steps } };
  },
});

// Moves one step on. Finishing adds the SOP to the worker's skills and counts one practice.
export const advance = internalMutation({
  args: { trainingId: v.id("trainings"), from: v.number() },
  handler: async (ctx, { trainingId, from }) => {
    const t = await ctx.db.get("trainings", trainingId);
    const sop = t && (await ctx.db.get("sops", t.sopId));
    if (!t || !sop || t.done || t.step !== from) return { step: t?.step ?? from, done: t?.done ?? false };
    if (t.step < sop.steps.length) {
      await ctx.db.patch("trainings", t._id, { step: t.step + 1 });
      return { step: t.step + 1, done: false };
    }
    await ctx.db.patch("trainings", t._id, { done: true, finishedAt: Date.now() });
    const w = await ctx.db.get("workers", t.workerId);
    if (w) {
      const skills = [...(w.skills ?? []).filter((s) => s !== sop.title), sop.title].slice(-5);
      await ctx.db.patch("workers", w._id, { skills, practiced: (w.practiced ?? 0) + 1 });
    }
    return { step: t.step, done: true };
  },
});

// Where a chat message goes: the worker's unfinished training, and the newest published SOP for START.
export const route = internalQuery({
  args: { phone: v.string() },
  handler: async (ctx, { phone }) => {
    const team = await ctx.db.query("teams").first();
    if (!team) return { active: null, newest: null };
    const sops = await ctx.db.query("sops").withIndex("by_team", (q) => q.eq("teamId", team._id)).order("desc").take(100);
    const w = await ctx.db.query("workers").withIndex("by_phone", (q) => q.eq("phone", phone)).unique();
    const rows = w
      ? await ctx.db.query("trainings").withIndex("by_worker", (q) => q.eq("workerId", w._id)).order("desc").take(100)
      : [];
    return {
      active: rows.find((r) => !r.done && !r.paused)?.sopId ?? null,
      newest: sops.find((s) => s.published)?._id ?? null,
    };
  },
});

// EXIT: leaves the training; progress is kept for when they come back.
export const exit = internalMutation({
  args: { phone: v.string() },
  handler: async (ctx, { phone }) => {
    const w = await ctx.db.query("workers").withIndex("by_phone", (q) => q.eq("phone", phone)).unique();
    if (!w) return null;
    for await (const t of ctx.db.query("trainings").withIndex("by_worker", (q) => q.eq("workerId", w._id))) {
      if (!t.done) await ctx.db.patch("trainings", t._id, { paused: true });
    }
    return null;
  },
});
