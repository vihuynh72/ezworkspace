import Anthropic from "@anthropic-ai/sdk";
import type { FunctionReturnType } from "convex/server";
import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import { action, type ActionCtx } from "./_generated/server";
import { pick } from "./knowledge";
import { PATHS, progressLine, progressOf, suggest } from "./paths";
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

const INTENTS = ["log", "plan", "try", "question", "greeting", "next", "new_hire", "progress"] as const;
type Intent = (typeof INTENTS)[number] | "share"; // SHARE is keyword-only

type Parsed = {
  isWork: boolean;
  task: string;
  category: string;
  tool: string | null;
  minutesPerWeek: number;
  keepHuman: boolean;
  originator: boolean;
};
type Log = Omit<Parsed, "isWork">;

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

// The one-word commands still work, with or without Claude. START and NEXT both run the current step.
const KEYWORDS = new Map<string, Intent>([
  ["plan", "plan"],
  ["try", "try"],
  ["next", "next"],
  ["start", "next"],
  ["new", "new_hire"],
  ["share", "share"],
]);
// Speech-to-text adds case and punctuation ("Plan.", "Stop!"), so commands compare without them.
export const command = (body: string) => body.toLowerCase().replace(/^[^a-z]+|[^a-z]+$/g, "");
// The first reply to anyone answers the question they're afraid to ask.
const HELLO = "Hi, I'm ezworkspace, your private AI coach. Will this be used to cut your job or judge you? No. Only you see what you tell me, and you can say STOP anytime.";
const TRY_ASK = "Paste one real example whenever you're ready, with names and account numbers removed.";
const say = (...parts: string[]) => parts.filter(Boolean).join(" ");

// One message in, one short reply out, always ending with one next step on the worker's path.
async function handle(ctx: ActionCtx, from: string, body: string): Promise<string> {
  // Erasing never depends on Claude.
  const word = command(body);
  if (/^(delete|stop|forget me)$/.test(word)) {
    await ctx.runMutation(internal.workers.forget, { phone: from });
    return "Deleted. Everything you told ezworkspace is gone, and you're no longer counted on your team.";
  }
  const me: Mine = await ctx.runQuery(internal.workers.mine, { phone: from });
  const kw = KEYWORDS.get(word);
  if (kw === "share") return await share(ctx, me);
  // One Claude call reads the message and writes the reply. A practice example reaches Claude here, once, and is never stored or logged.
  // Up to 2 excerpts from the team's own SOPs, so the coach cites them instead of guessing.
  const sources = pick(await ctx.runQuery(internal.knowledge.sources, {}), body);
  const ai = await coach(me, body, sources).catch((e) => {
    console.error("Claude failed, using keywords and templates", e);
    return null;
  });
  // A practice example is never stored, so nothing from it reaches the memory either.
  if (me.workerId && me.mode !== "try" && ai?.memory) {
    await ctx.runMutation(internal.workers.remember, { workerId: me.workerId, memory: ai.memory });
  }
  let intent: Intent = kw ?? ai?.intent ?? (me.mode === "try" ? "try" : guess(body));
  if (me.mode === "try" && intent === "log") intent = "try"; // a practice example is never saved as a log
  // Claude's words only fit the intent it wrote them for; otherwise the templates answer.
  const said = ai?.intent === intent ? ai.reply : "";
  const hello = me.workerId ? "" : HELLO;

  if (intent === "log") {
    const log = ai?.intent === "log" ? ai.log : parseKeywords(body);
    const p = await ctx.runMutation(internal.workers.store, { phone: from, ...log, isWork: true });
    const shareAsk = log.originator && !log.keepHuman ? "Want teammates to learn this? Reply SHARE." : "";
    return say(hello, said || ack(log), shareAsk, suggest(p.track, p.step, p.advanced));
  }
  // Any other first text also puts the worker on file (they count as a voice); saying you're new switches paths.
  let { workerId, track, step } = me;
  if (!workerId || intent === "new_hire") {
    ({ workerId, track, step } = await ctx.runMutation(
      internal.workers.begin,
      intent === "new_hire" ? { phone: from, track: "newhire" } : { phone: from },
    ));
  }
  // Asking for something else ends practice mode, uncounted.
  if (me.mode === "try" && intent !== "try" && intent !== "question" && intent !== "greeting") {
    await ctx.runMutation(internal.workers.endTry, { workerId, practiced: false });
  }
  if (intent === "try" && me.mode === "try" && kw !== "try") {
    const p = await ctx.runMutation(internal.workers.endTry, {
      workerId,
      practiced: said !== "",
      ...(said && ai ? { skill: ai.log.task, category: ai.log.category } : {}),
    });
    return say(
      said || "I couldn't reach the AI just now, and your example wasn't saved or sent anywhere.",
      suggest(p.track, p.step, p.advanced),
    );
  }
  if (intent === "progress") return say(hello, progressLine(progressOf(me, me.logs)), suggest(track, step, false));
  if (intent === "question" || intent === "greeting") {
    const chat = said || (intent === "question" ? "Sorry, I can't answer that one right now." : "Good to hear from you.");
    return say(hello, hello && intent === "greeting" ? "" : chat, me.mode === "try" ? TRY_ASK : suggest(track, step, false));
  }
  // "What's next" and NEW run the current step; PLAN and TRY run theirs anytime.
  const current = PATHS[track][step - 1];
  const run = intent === "next" || intent === "new_hire" ? current?.done : intent;
  const welcome = intent === "new_hire" ? said || "Welcome to the team!" : "";
  const draft = intent === "new_hire" || (kw === "try" && me.mode === "try") ? "" : said;
  if (run === "plan") {
    if (me.logs.length === 0) {
      return say(hello, welcome, "I build your plan from your own tasks, so let's start there.", suggest(track, step, false));
    }
    const p = await ctx.runMutation(internal.workers.markPlan, { workerId });
    return say(welcome, draft || templatePlan(me), suggest(p.track, p.step, p.advanced));
  }
  if (run === "try") {
    await ctx.runMutation(internal.workers.startTry, { workerId });
    const top = me.logs.filter((l) => !l.keepHuman).sort((a, b) => b.minutesPerWeek - a.minutesPerWeek).at(0);
    return say(hello, welcome, draft || invite(me.workflow?.title ?? top?.task));
  }
  if (!current) return say(hello, welcome, suggest(track, step, true));
  const intro = track === "newhire" && step === 1 ? playbook(me) : "";
  return say(hello, welcome, `Step ${step} of ${PATHS[track].length}:`, intro, current.ask);
}

const SCHEMA = {
  type: "object",
  properties: {
    intent: { type: "string", enum: [...INTENTS] },
    task: { type: "string" },
    category: { type: "string", enum: CATEGORIES },
    tool: { type: "string" },
    minutesPerWeek: { type: "number" },
    keepHuman: { type: "boolean" },
    originator: { type: "boolean" },
    reply: { type: "string" },
    memory: { type: "string" },
  },
  required: ["intent", "task", "category", "tool", "minutesPerWeek", "keepHuman", "originator", "reply", "memory"],
  additionalProperties: false,
};

const SYSTEM = `You are ezworkspace, a private AI transition coach for one accounts-payable worker. Many have no AI background: veteran staff moving into AI-assisted work, or new hires. They talk or type, and your reply may be read aloud. The user turn is JSON: their "message", plus what you know about them.

How you coach: one move per turn, so each reply does one thing.
- Show: when they ask how to do something, show a tiny worked example from their own task or from "sources".
- Try: invite them to do it with AI on one real example of their own (that is TRY). Nothing they paste is stored.
- Review: after AI does their example, say exactly what a human must check before it's used.
- Reflect: when they react, say in one line what they just learned. It goes on their skills list.

Rules you always follow:
- Using ezworkspace is their choice, and they can stop anytime: STOP or DELETE erases everything. Never pressure, guilt or rush them. "Not now" is a fine answer.
- Nothing here is ever used for performance reviews, discipline or pay decisions.
- Never ask for names of people, clients or vendors, account numbers or other client data. If they share some, don't repeat it.
- Say plainly that AI can be wrong and that a human checks its output before it's used.
- Respect keep-human tasks: never push AI onto work they want to keep.
- "sources" are excerpts from their team's own SOPs and guides. When your reply uses one, end the reply with its title as a short citation, like "(Source: AP exception handling SOP)". Never invent SOP steps, amounts or rules. If the sources don't cover it, say so and suggest they check with their lead.

intent:
- log: they describe a task they do at work, how AI helps with one, or what should stay human.
- plan: they want their plan (PLAN).
- try: they want to practice a task with AI (TRY). When "mode" is "try", you just asked them for one example of a task: the message is that example unless it clearly asks for something else, and it is never a log.
- next: they ask what to do next, say they're ready, or say START or NEXT.
- new_hire: they say they're new or just joined the team (NEW).
- progress: they ask how they're doing, or about their progress.
- question: any other question: about AI, their work, privacy, pay or the Compact.
- greeting: hello, thanks, small talk, or a reaction to something you said.

Log fields, used when intent is log. When mode is "try" and you do their example, fill only task and category, for the task they practiced. Otherwise use "", "Other", "", 0, false, false:
- task: the task in at most 8 words. Never include names of people, clients or vendors.
- category: the closest of: ${CATEGORIES.join(", ")}.
- tool: the AI tool they use for it (for example "ChatGPT"), or "" if none.
- minutesPerWeek: minutes per week AI saves them on this task, or could save if they do it by hand today. Convert per-day figures using 5 workdays. If no number is given, estimate conservatively. Use 0 when keepHuman is true.
- keepHuman: true if they want to keep doing it themselves, enjoy it, or it needs a human touch.
- originator: true if they came up with using AI for this task themselves.

reply: friendly, plain spoken words that someone with no AI background understands. No lists, markdown, emojis, line breaks or jargon. Never invent tasks, numbers, names or amounts. Don't suggest a next step or ask what they want to do: the app adds exactly one after your reply (a TRY invite is the exception, since it is the next step).
- log: one short sentence, at most 120 characters, like "Saved privately: ChatGPT drafts your vendor emails, about 2 hours a week." For a keep-human task, say it stays theirs. If they came up with the shortcut themselves, say briefly that they get the credit.
- question: one or two short sentences, at most 200 characters, plus any citation. Use their logs and "sources" when relevant. A how-to question gets a Show, at most 300 characters.
- greeting: one short, warm sentence. If they react to a practice draft, that's the Reflect: you can't see the draft because it was never saved, so thank them and say in one line what they just learned (their newest "skills" entry), and that their judgment is the skill that matters.
- plan: built only from their logs, at most 450 characters, in four sentences: "AI takes: <their tasks where AI saves time, with the total hours a week>." "You keep: <their keep-human tasks, or the judgment and people side of the job>." "You grow into: <the same role evolved for AI, as one concrete responsibility>." Then "Your company signed the Compact: no pay cuts or AI layoffs for 12 months." if signed is true, else "Nothing changes for you until your company signs the Compact." For a new hire (track "newhire"), make it a first-month plan.
- try, when mode is not "try": if "workflow" is set, invite them to learn that team workflow in one sentence, then say what to paste. Otherwise invite them to paste ONE real example of their top task that isn't keep-human (with no logs, of a weekly task they'd like help with), saying concretely what to paste, like the text of one vendor email, with names and account numbers removed. Say you'll do it with AI right here and nothing is saved or sent. At most 250 characters.
- try, when mode is "try": do the task on their example the way a good AI assistant would, like drafting the reply to a vendor email or checking an invoice line against its PO. If it matches "workflow", follow its steps. If a source covers the task, follow it and cite it. If they only named a task, use a short made-up example and say so. Then the Review, in one plain sentence: exactly what they must check before it's used, like the unit price against the PO, because AI can be wrong. At most 450 characters, as plain sentences; only a drafted email or letter keeps its line breaks.
- next: do their "current" step: if its done is "plan", write the plan; if "try", write the invite; otherwise "".
- new_hire: a short, warm welcome to the team, at most 60 characters.
- progress: "" (the app writes their numbers).

memory: 1-2 short sentences for your own future replies: their role, tasks, goals and skills learned. No names of other people, no client details. Start from their current "memory" and keep what still matters.

Facts you can rely on: only they see what they send, and saying DELETE erases all of it. Their employer sees team totals only, and groups under 3 people stay hidden. Using AI on the side is fine, and whoever found a shortcut gets the credit. AI will sometimes be wrong, so it only drafts and they decide, like checking a new coworker's work; anything that moves money, changes bank details or feels off goes to a person. Using ezworkspace is their choice. The team map stays sealed until "quorum" coworkers have joined ("voices" so far) and the company signs the Compact. Once signed: no pay cuts or AI layoffs for 12 months, and any role change comes with a funded transition plan. They get paid time to practice with you on company time. Sharing how they use AI can never be used against them. "signed" says whether their company has signed. "playbook" is how their team uses AI (null while sealed). "workflow" is the newest team workflow they haven't learned yet. They are on "step" of "steps" of their guided path ("track").`;

type Turn = { intent: Intent; reply: string; log: Log; memory: string };

// The single Claude call per message, or null (no key, or a refusal) so the caller uses keywords and templates.
async function coach(me: Mine, body: string, sources: { title: string; text: string }[]): Promise<Turn | null> {
  const { workerId, shareable, ...context } = me;
  const out = await claude<Log & { intent: Intent; reply: string; tool: string; memory: string }>(SYSTEM, SCHEMA, {
    ...context,
    newWorker: workerId === null,
    steps: PATHS[me.track].length,
    current: PATHS[me.track][me.step - 1] ?? null,
    sources,
    message: body,
  });
  if (!out) return null;
  const { intent, reply, tool, memory, ...log } = out;
  return {
    intent,
    reply: reply.trim(),
    memory: memory.trim(),
    log: { ...log, tool: tool || null, minutesPerWeek: log.keepHuman ? 0 : Math.max(0, Math.round(log.minutesPerWeek)) },
  };
}

// One structured Claude call, or null when there's no key or Claude refuses.
async function claude<T>(system: string, schema: Record<string, unknown>, user: unknown): Promise<T | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  const res = await new Anthropic().beta.messages.create({
    model: "claude-opus-5-5",
    max_tokens: 4000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low", format: { type: "json_schema", schema } },
    system,
    messages: [{ role: "user", content: JSON.stringify(user) }],
  });
  const block = res.content.find((b) => b.type === "text");
  if (res.stop_reason === "refusal" || block?.type !== "text") return null;
  return JSON.parse(block.text) as T;
}

const SHARE_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    category: { type: "string", enum: CATEGORIES },
    steps: { type: "array", items: { type: "string" } },
  },
  required: ["title", "category", "steps"],
  additionalProperties: false,
};

const SHARE_SYSTEM = `You turn one accounts-payable worker's AI shortcut into a team workflow a teammate can learn in 2 minutes. The user turn is JSON with the task, its category and the AI tool.
- title: at most 8 words, like "Match invoices to POs with ChatGPT".
- category: the closest of the given categories.
- steps: 3 or 4 short, plain steps, at most 12 words each, like "Paste the invoice line and the PO line". One step is checking the AI's work yourself.
No names of people, clients or vendors, and no client details.`;

type Shareable = NonNullable<Mine["shareable"]>;

// SHARE: the worker's newest shortcut becomes a draft team workflow for the manager, without their name.
async function share(ctx: ActionCtx, me: Mine): Promise<string> {
  if (!me.workerId || !me.shareable) {
    return say("There's no new shortcut to share yet. Tell me about one you came up with, then reply SHARE.");
  }
  const s = me.shareable;
  const ai = await claude<{ title: string; category: string; steps: string[] }>(SHARE_SYSTEM, SHARE_SCHEMA, s).catch((e) => {
    console.error("Claude failed, using the workflow template", e);
    return null;
  });
  const steps = ai?.steps.map((x) => x.trim()).filter(Boolean).slice(0, 4) ?? [];
  await ctx.runMutation(
    internal.workers.share,
    ai && steps.length >= 3
      ? { workerId: me.workerId, title: ai.title.trim().slice(0, 80), category: ai.category, steps }
      : { workerId: me.workerId, ...templateWorkflow(s) },
  );
  return say(
    "Thanks! Your manager will see it as an idea from a teammate. Your name stays private.",
    suggest(me.track, me.step, false),
  );
}

const templateWorkflow = (s: Shareable) => ({
  title: s.task,
  category: s.category,
  steps: [
    `Open ${s.tool ?? "your AI tool"} and paste the details, with names removed`,
    `Ask it to do the first pass: ${s.task.toLowerCase()}`,
    "Check every number and flag yourself",
    "Send or file it only once it looks right",
  ],
});

const ack = (l: Log) =>
  l.keepHuman
    ? `Saved privately: "${l.task}" stays yours.`
    : `Saved privately: "${l.task}", about ${Math.round(l.minutesPerWeek / 6) / 10} hours a week${l.tool ? ` with ${l.tool}` : ""}.`;

const invite = (task?: string) =>
  `${task ? `Let's practice "${task}".` : "Which weekly task would you like help with?"} ` +
  "Paste one real example of it, with names and account numbers removed, and I'll do it with AI right here. Nothing is saved or sent anywhere.";

// New hires meet the team's AI playbook: aggregates only, and only once the Compact is signed.
function playbook({ playbook: p }: Mine): string {
  if (!p?.ai.length) {
    return "Your team's AI playbook opens once your company signs the Compact. Teams like yours usually start with invoice matching, data entry and exception emails.";
  }
  const ai = p.ai.map((c) => c.toLowerCase());
  const uses = ai.length > 1 ? `${ai.slice(0, -1).join(", ")} and ${ai.at(-1)}` : ai[0];
  return `Your team uses AI most for ${uses}${p.keep[0] ? `, and keeps work like "${p.keep[0]}" human` : ""}.`;
}

function templatePlan(me: Mine): string {
  const ai = me.logs.filter((l) => !l.keepHuman && l.minutesPerWeek > 0);
  const keep = me.logs.filter((l) => l.keepHuman);
  const hrs = Math.round(ai.reduce((s, l) => s + l.minutesPerWeek, 0) / 6) / 10;
  return [
    `AI takes: ${ai.length ? `${ai.map((l) => l.task).join(", ")}, about ${hrs} hours a week` : "nothing yet"}.`,
    `You keep: ${keep.map((l) => l.task).join(", ") || "the judgment calls and the people side of your job"}.`,
    "You grow into: the same role, with AI doing the repetitive part while you own the exceptions and relationships.",
    me.signed
      ? "Your company signed the Compact: no pay cuts or AI layoffs for 12 months."
      : "Nothing changes for you until your company signs the Compact.",
  ].join(" ");
}

// Plain-words routing for when Claude is unavailable.
export function guess(body: string): Intent {
  const t = body.toLowerCase();
  if (/\bhow am i doing\b|\bmy progress\b/.test(t)) return "progress";
  if (/\bplan\b/.test(t)) return "plan";
  if (/\b(practi[cs]e|try)\b/.test(t)) return "try";
  if (/\b(i['’]?m new|new here|just (joined|started)|new hire|first (day|week))\b/.test(t)) return "new_hire";
  if (/\b(next|ready|start)\b/.test(t)) return "next";
  return parseKeywords(body).isWork ? "log" : t.includes("?") ? "question" : "greeting";
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
