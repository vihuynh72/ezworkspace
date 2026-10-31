import Anthropic from "@anthropic-ai/sdk";
import type { FunctionReturnType } from "convex/server";
import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import { action, type ActionCtx } from "./_generated/server";
import { DIVIDEND_PCT } from "./lib";
import { assertAgent } from "./util";

type Mine = FunctionReturnType<typeof internal.workers.mine>;

const CATEGORIES = [
  "Invoice matching",
  "Data entry",
  "Exception emails",
  "Vendor calls",
  "Month-end reporting",
  "Onboarding new hires",
  "Other",
];

type Parsed = {
  isWork: boolean;
  task: string;
  category: string;
  tool: string | null;
  minutesPerWeek: number;
  keepHuman: boolean;
  originator: boolean;
};

// Called by the iMessage agent for every inbound text; returns the reply to send back.
export const text = action({
  args: { secret: v.string(), from: v.string(), body: v.string() },
  handler: async (ctx, { secret, from, body }): Promise<string> => {
    assertAgent(secret);
    return await handle(ctx, from, body);
  },
});

// Web fallback for workers without iMessage: a random per-browser id stands in for the phone number.
// shortcut: no rate limit on this public action; add @convex-dev/rate-limiter before real users
export const web = action({
  args: { deviceId: v.string(), body: v.string() },
  handler: async (ctx, { deviceId, body }): Promise<string> => {
    // 2000, not 500: a TRY example can be a whole pasted email.
    if (!/^[\w-]{8,64}$/.test(deviceId) || !body.trim() || body.length > 2000) {
      throw new ConvexError("Messages must be 1-2000 characters.");
    }
    return await handle(ctx, `web:${deviceId}`, body);
  },
});

async function handle(ctx: ActionCtx, from: string, body: string): Promise<string> {
  if (/^\s*(delete|stop|forget me)\s*$/i.test(body)) {
    await ctx.runMutation(internal.workers.forget, { phone: from });
    return "Deleted. Everything you told ezworkspace is gone, and you're no longer counted on your team.";
  }
  const me: Mine = await ctx.runQuery(internal.workers.mine, { phone: from });
  if (/^\s*plan\s*$/i.test(body)) {
    if (!me.workerId || me.logs.length === 0) {
      return "Tell me about one thing you do each week first, then text PLAN.";
    }
    const plan =
      (await writePlan(me).catch((e) => {
        console.error("Claude plan failed, using template", e);
        return null;
      })) ?? templatePlan(me);
    await ctx.runMutation(internal.workers.markPlan, { workerId: me.workerId });
    return plan;
  }
  if (/^\s*try\s*$/i.test(body)) {
    if (!me.workerId) return "Tell me about one thing you do each week first, then text TRY.";
    await ctx.runMutation(internal.workers.startTry, { workerId: me.workerId });
    const top = me.logs.filter((l) => !l.keepHuman).sort((a, b) => b.minutesPerWeek - a.minutesPerWeek).at(0);
    return (
      (await claude(TRY_SYSTEM, JSON.stringify({ task: top?.task ?? null })).catch((e) => {
        console.error("Claude TRY invite failed, using template", e);
        return null;
      })) ??
      (top ? `Let's practice "${top.task}". Paste ONE real example of it` : "Which weekly task would you like help with? Paste ONE real example of it") +
        ", with names and account numbers removed. I'll do it with AI right here so you can see how. Nothing is sent anywhere."
    );
  }
  if (me.workerId && me.mode === "try") {
    // The example goes to Claude once and is never stored or logged.
    const done = await claude(PRACTICE_SYSTEM, JSON.stringify({ logs: me.logs, example: body })).catch((e) => {
      console.error("Claude practice failed", e);
      return null;
    });
    await ctx.runMutation(internal.workers.endTry, { workerId: me.workerId, practiced: done !== null });
    return done
      ? `${done}\n\nYou're the reviewer: what would you change? Nothing was sent anywhere.`
      : "I couldn't reach the AI just now. Your example wasn't saved or sent anywhere. Text TRY to try again.";
  }
  const parsed =
    (await parseWithClaude(body).catch((e) => {
      console.error("Claude parse failed, using keywords", e);
      return null;
    })) ?? parseKeywords(body);
  if (!parsed.isWork && me.workerId) {
    return (
      (await claude(ANSWER_SYSTEM, JSON.stringify({ team: me.team, signed: me.signed, voices: me.voices, quorum: me.quorum, logs: me.logs, message: body })).catch((e) => {
        console.error("Claude answer failed, using template", e);
        return null;
      })) ??
      "I can't answer that one right now. Tell me one thing you do each week, text TRY to practice a task with AI, or PLAN for your personal transition plan."
    );
  }
  return await ctx.runMutation(internal.workers.store, { phone: from, ...parsed });
}

const SCHEMA = {
  type: "object",
  properties: {
    isWork: { type: "boolean" },
    task: { type: "string" },
    category: { type: "string", enum: CATEGORIES },
    tool: { type: "string" },
    minutesPerWeek: { type: "number" },
    keepHuman: { type: "boolean" },
    originator: { type: "boolean" },
  },
  required: ["isWork", "task", "category", "tool", "minutesPerWeek", "keepHuman", "originator"],
  additionalProperties: false,
};

const SYSTEM = `You read one text message from an accounts-payable worker and log the work it describes.
- isWork: false for greetings, questions, reactions to a practice draft (like "make it friendlier"), or anything not about their work.
- task: the task in at most 8 words. Never include names of people, clients or vendors.
- category: the closest of: ${CATEGORIES.join(", ")}.
- tool: the AI tool they use for it (for example "ChatGPT"), or "" if none.
- minutesPerWeek: minutes per week AI saves them on this task, or could save if they do it by hand today. Convert per-day figures using 5 workdays. If no number is given, estimate conservatively. Use 0 when keepHuman is true.
- keepHuman: true if they want to keep doing it themselves, enjoy it, or it needs a human touch.
- originator: true if they came up with using AI for this task themselves.`;

async function parseWithClaude(body: string): Promise<Parsed | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  const res = await new Anthropic().beta.messages.create({
    model: "claude-opus-5-5",
    max_tokens: 4000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
    system: SYSTEM,
    messages: [{ role: "user", content: body }],
  });
  const block = res.content.find((b) => b.type === "text");
  if (res.stop_reason === "refusal" || !block || block.type !== "text") return null;
  const p = JSON.parse(block.text) as Omit<Parsed, "tool"> & { tool: string };
  return {
    ...p,
    tool: p.tool || null,
    minutesPerWeek: p.keepHuman ? 0 : Math.max(0, Math.round(p.minutesPerWeek)),
  };
}

const PLAN_SYSTEM = `You are ezworkspace, a private AI transition coach texting one worker over iMessage. Using only the worker's own task logs (JSON), write their transition plan in plain text: no markdown, no emojis, under 600 characters, exactly these four lines:
AI takes: <their tasks where AI saves time, with the total hours per week>
You keep: <their keep-human tasks, or the judgment and people side of the job>
You grow into: <the same role evolved for AI, as a concrete responsibility, e.g. "the AP specialist who owns vendor relationships and reviews AI-flagged exceptions">
This week: <one small, concrete step>
Then one closing line: if "signed" is true, "Your company signed the Compact: no pay cuts or AI layoffs for 12 months." Otherwise, "Nothing changes for you until your company signs the Compact."
Never invent tasks or numbers that are not in the logs.`;

async function writePlan(me: Mine): Promise<string | null> {
  return claude(PLAN_SYSTEM, JSON.stringify({ team: me.team, signed: me.signed, logs: me.logs }));
}

const TRY_SYSTEM = `You are ezworkspace, a private AI transition coach texting a worker who has never used AI. They just texted TRY to practice one real task with AI. The JSON names their task, or null if you don't know it yet.
Invite them to paste ONE real example of that task, saying concretely what to paste (for example the text of one vendor email, or one invoice line and its PO line), with names and account numbers removed. If the task is null, ask them to name a weekly task they'd like help with and paste one example of it, in one message.
Say you'll do it with AI right here so they can see how, and that nothing is sent anywhere.
Plain text, no markdown or emojis, at most 300 characters.`;

const PRACTICE_SYSTEM = `You are ezworkspace, a private AI transition coach. A worker who has never used AI texted TRY, then sent one real example from their job ("example"). Their task logs are context.
First, do the task on their example the way a good AI assistant would: for example, draft the reply to a vendor email, pull the fields out of an invoice, or check an invoice line against its PO. If they only named a task, do it on a short made-up example and say so. Never invent names, amounts or account numbers that are not in their example.
Then explain in 1-2 plain sentences what AI just did, for someone with no AI background.
Plain text: no markdown, asterisks, bullets or emojis. At most 800 characters. Stop there; a closing line is added after your text.`;

const ANSWER_SYSTEM = `You are ezworkspace, a private AI transition coach texting one worker. Reply to their message in plain language for someone with no AI background: no jargon, plain text, no markdown or emojis, at most 450 characters.
- Ground your answer in their own task logs when relevant. Never invent tasks or numbers.
- Facts you can rely on: only they see what they send. Their employer sees team totals only, and groups under 3 people stay hidden. Using AI on the side is fine (amnesty), and whoever found a shortcut gets the credit. The team map stays sealed until "quorum" coworkers have joined ("voices" so far) and the company signs the Compact. Once signed: no pay cuts or AI layoffs for 12 months, any role change comes with a funded transition plan, and ${DIVIDEND_PCT}% of measured AI savings goes to the workers who surfaced them, paid before ezworkspace's fee. "signed" says whether their company has signed.
- If they seem to be reacting to a practice draft: you can't see it because it was never saved, so thank them and say their judgment is exactly the skill that matters.
- End with one next step, such as "Text TRY to practice one task with AI." or "Text PLAN for your plan."`;

// One plain-text Claude reply, or null (no key, or a refusal) so the caller can use its template.
async function claude(system: string, content: string): Promise<string | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  const res = await new Anthropic().beta.messages.create({
    model: "claude-opus-5-5",
    max_tokens: 4000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low" },
    system,
    messages: [{ role: "user", content }],
  });
  const block = res.content.find((b) => b.type === "text");
  return res.stop_reason !== "refusal" && block?.type === "text" ? block.text.trim() : null;
}

function templatePlan(me: Mine): string {
  const ai = me.logs.filter((l) => !l.keepHuman && l.minutesPerWeek > 0);
  const keep = me.logs.filter((l) => l.keepHuman);
  const hrs = Math.round(ai.reduce((s, l) => s + l.minutesPerWeek, 0) / 6) / 10;
  return [
    `AI takes: ${ai.map((l) => l.task).join("; ") || "nothing yet"} (about ${hrs} hrs/week)`,
    `You keep: ${keep.map((l) => l.task).join("; ") || "the judgment calls and the people side of your job"}`,
    "You grow into: the same role, with AI doing the repetitive part while you own the exceptions and relationships",
    "This week: pick one task above and write down what you'd double-check if AI did it",
    me.signed
      ? "Your company signed the Compact: no pay cuts or AI layoffs for 12 months."
      : "Nothing changes for you until your company signs the Compact.",
  ].join("\n");
}

// Fallback when there's no API key or Claude is slow or down.
function parseKeywords(body: string): Parsed {
  const t = body.toLowerCase();
  const n = t.match(/(\d+(?:\.\d+)?)\s*(hours?|hrs?|minutes?|mins?)\b/);
  const tool = ["chatgpt", "claude", "copilot", "gemini"].find((k) => t.includes(k));
  const category =
    /invoice|match|\bpo\b/.test(t) ? "Invoice matching"
    : /email/.test(t) ? "Exception emails"
    : /enter|typ|pdf|key/.test(t) ? "Data entry"
    : /vendor|call/.test(t) ? "Vendor calls"
    : /report|month|close|accrual/.test(t) ? "Month-end reporting"
    : "Other";
  const keepHuman = /\b(keep|love|myself|human)\b/.test(t);
  const minutes = n ? Math.round(parseFloat(n[1]) * (n[2].startsWith("h") ? 60 : 1)) : 60;
  return {
    isWork: n !== null || tool !== undefined || category !== "Other",
    task: body.trim().slice(0, 60),
    category,
    tool: tool ? tool[0].toUpperCase() + tool.slice(1).replace("gpt", "GPT") : null,
    minutesPerWeek: keepHuman ? 0 : minutes,
    keepHuman,
    originator: tool !== undefined,
  };
}
