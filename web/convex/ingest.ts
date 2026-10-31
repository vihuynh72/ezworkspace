import Anthropic from "@anthropic-ai/sdk";
import type { FunctionReturnType } from "convex/server";
import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import { action, type ActionCtx } from "./_generated/server";
import { DIVIDEND_PCT } from "./lib";
import { PATHS, suggest } from "./paths";
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

const INTENTS = ["log", "plan", "try", "question", "greeting", "next", "new_hire"] as const;
type Intent = (typeof INTENTS)[number];

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
]);
// The first reply to anyone answers the question they're afraid to ask.
const HELLO = "Hi, I'm ezworkspace, your private AI coach. Will this be used to cut your job? No, and only you see what you tell me.";
const TRY_ASK = "Paste one real example whenever you're ready, with names and account numbers removed.";
const say = (...parts: string[]) => parts.filter(Boolean).join(" ");

// One message in, one short reply out, always ending with one next step on the worker's path.
async function handle(ctx: ActionCtx, from: string, body: string): Promise<string> {
  // Erasing never depends on Claude.
  if (/^\s*(delete|stop|forget me)\s*$/i.test(body)) {
    await ctx.runMutation(internal.workers.forget, { phone: from });
    return "Deleted. Everything you told ezworkspace is gone, and you're no longer counted on your team.";
  }
  const me: Mine = await ctx.runQuery(internal.workers.mine, { phone: from });
  const kw = KEYWORDS.get(body.trim().toLowerCase());
  // One Claude call reads the message and writes the reply. A practice example reaches Claude here, once, and is never stored or logged.
  const ai = await coach(me, body).catch((e) => {
    console.error("Claude failed, using keywords and templates", e);
    return null;
  });
  let intent: Intent = kw ?? ai?.intent ?? (me.mode === "try" ? "try" : guess(body));
  if (me.mode === "try" && intent === "log") intent = "try"; // a practice example is never saved as a log
  // Claude's words only fit the intent it wrote them for; otherwise the templates answer.
  const said = ai?.intent === intent ? ai.reply : "";
  const hello = me.workerId ? "" : HELLO;

  if (intent === "log") {
    const log = ai?.intent === "log" ? ai.log : parseKeywords(body);
    const p = await ctx.runMutation(internal.workers.store, { phone: from, ...log, isWork: true });
    return say(hello, said || ack(log), suggest(p.track, p.step, p.advanced));
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
    const p = await ctx.runMutation(internal.workers.endTry, { workerId, practiced: said !== "" });
    return say(
      said || "I couldn't reach the AI just now, and your example wasn't saved or sent anywhere.",
      suggest(p.track, p.step, p.advanced),
    );
  }
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
    return say(hello, welcome, draft || invite(top?.task));
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
  },
  required: ["intent", "task", "category", "tool", "minutesPerWeek", "keepHuman", "originator", "reply"],
  additionalProperties: false,
};

const SYSTEM = `You are ezworkspace, a private AI transition coach for one accounts-payable worker. Many have no AI background: veteran staff moving into AI-assisted work, or new hires. They talk or type, and your reply may be read aloud. The user turn is JSON: their "message", plus what you know about them.

intent:
- log: they describe a task they do at work, how AI helps with one, or what should stay human.
- plan: they want their plan (PLAN).
- try: they want to practice a task with AI (TRY). When "mode" is "try", you just asked them for one example of a task: the message is that example unless it clearly asks for something else, and it is never a log.
- next: they ask what to do next, say they're ready, or say START or NEXT.
- new_hire: they say they're new or just joined the team (NEW).
- question: any other question: about AI, their work, privacy, pay or the Compact.
- greeting: hello, thanks, small talk, or a reaction to something you said.

Log fields, used only when intent is log (otherwise use "", "Other", "", 0, false, false):
- task: the task in at most 8 words. Never include names of people, clients or vendors.
- category: the closest of: ${CATEGORIES.join(", ")}.
- tool: the AI tool they use for it (for example "ChatGPT"), or "" if none.
- minutesPerWeek: minutes per week AI saves them on this task, or could save if they do it by hand today. Convert per-day figures using 5 workdays. If no number is given, estimate conservatively. Use 0 when keepHuman is true.
- keepHuman: true if they want to keep doing it themselves, enjoy it, or it needs a human touch.
- originator: true if they came up with using AI for this task themselves.

reply: friendly, plain spoken words that someone with no AI background understands. No lists, markdown, emojis, line breaks or jargon. Never invent tasks, numbers, names or amounts. Don't suggest a next step or ask what they want to do: the app adds exactly one after your reply (a TRY invite is the exception, since it is the next step).
- log: one short sentence, at most 120 characters, like "Saved privately: ChatGPT drafts your vendor emails, about 2 hours a week." For a keep-human task, say it stays theirs. If they came up with the shortcut themselves, say briefly that they get the credit.
- question: one or two short sentences, at most 200 characters. Use their logs when relevant.
- greeting: one short, warm sentence. If they react to a practice draft, you can't see it because it was never saved: thank them and say their judgment is exactly the skill that matters.
- plan: built only from their logs, at most 450 characters, in four sentences: "AI takes: <their tasks where AI saves time, with the total hours a week>." "You keep: <their keep-human tasks, or the judgment and people side of the job>." "You grow into: <the same role evolved for AI, as one concrete responsibility>." Then "Your company signed the Compact: no pay cuts or AI layoffs for 12 months." if signed is true, else "Nothing changes for you until your company signs the Compact." For a new hire (track "newhire"), make it a first-month plan.
- try, when mode is not "try": invite them to paste ONE real example of their top task that isn't keep-human (with no logs, of a weekly task they'd like help with), saying concretely what to paste, like the text of one vendor email, with names and account numbers removed. Say you'll do it with AI right here and nothing is saved or sent. At most 250 characters.
- try, when mode is "try": do the task on their example the way a good AI assistant would, like drafting the reply to a vendor email or checking an invoice line against its PO. If they only named a task, use a short made-up example and say so. Then, in one plain sentence, say what AI just did and that they're the reviewer who checks the numbers before it's used. At most 450 characters, as plain sentences; only a drafted email or letter keeps its line breaks.
- next: do their "current" step: if its done is "plan", write the plan; if "try", write the invite; otherwise "".
- new_hire: a short, warm welcome to the team, at most 60 characters.

Facts you can rely on: only they see what they send, and saying DELETE erases all of it. Their employer sees team totals only, and groups under 3 people stay hidden. Using AI on the side is fine, and whoever found a shortcut gets the credit. AI will sometimes be wrong, so it only drafts and they decide, like checking a new coworker's work; anything that moves money, changes bank details or feels off goes to a person. Using ezworkspace is their choice. The team map stays sealed until "quorum" coworkers have joined ("voices" so far) and the company signs the Compact. Once signed: no pay cuts or AI layoffs for 12 months, any role change comes with a funded transition plan, and ${DIVIDEND_PCT}% of measured AI savings goes to the workers who surfaced them, paid before ezworkspace's fee. "signed" says whether their company has signed. "playbook" is how their team uses AI (null while sealed). They are on "step" of "steps" of their guided path ("track").`;

type Turn = { intent: Intent; reply: string; log: Log };

// The single Claude call per message, or null (no key, or a refusal) so the caller uses keywords and templates.
async function coach(me: Mine, body: string): Promise<Turn | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  const { workerId, ...context } = me;
  const res = await new Anthropic().beta.messages.create({
    model: "claude-opus-5-5",
    max_tokens: 4000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: JSON.stringify({
          ...context,
          newWorker: workerId === null,
          steps: PATHS[me.track].length,
          current: PATHS[me.track][me.step - 1] ?? null,
          message: body,
        }),
      },
    ],
  });
  const block = res.content.find((b) => b.type === "text");
  if (res.stop_reason === "refusal" || block?.type !== "text") return null;
  const { intent, reply, tool, ...log } = JSON.parse(block.text) as Log & { intent: Intent; reply: string; tool: string };
  return {
    intent,
    reply: reply.trim(),
    log: { ...log, tool: tool || null, minutesPerWeek: log.keepHuman ? 0 : Math.max(0, Math.round(log.minutesPerWeek)) },
  };
}

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
