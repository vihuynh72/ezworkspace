import { ConvexClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";
import { Spectrum, attachment, type Space } from "spectrum-ts";
import { effect, imessage } from "spectrum-ts/providers/imessage";

type OutboxRow = { _id: string; to: string; body: string };

// Typed refs to web/convex by name: no codegen import across packages (anyApi fails noUncheckedIndexedAccess).
const ingestText = makeFunctionReference<"action", { secret: string; from: string; body: string }, string>("ingest:text");
const outboxPending = makeFunctionReference<"query", { secret: string }, OutboxRow[]>("outbox:pending");
const outboxMarkSent = makeFunctionReference<"mutation", { secret: string; id: string }>("outbox:markSent");
const speakAgent = makeFunctionReference<"action", { secret: string; text: string }, string>("voice:speakAgent");

const convex = new ConvexClient(process.env.CONVEX_URL!);
const secret = process.env.AGENT_SECRET!;
const callToken = process.env.VOICE_CALL_TOKEN ?? ""; // turns phone calls on; see .env.example
const callsOn = callToken.length >= 16; // the token is the only lock on the public call webhook
if (callToken && !callsOn) console.error("[call] VOICE_CALL_TOKEN must be 16+ characters; phone calls are off.");
// shortcut: spectrum-ts 12.14 gives no transcript for voice memos; transcribe them here once it does.
const VOICE_MEMO_REPLY = callsOn
  ? "I can't listen to voice memos yet. Call me, or type it."
  : "I can't listen to voice memos yet. Type it and I'll answer.";

const app = await Spectrum({
  projectId: process.env.PROJECT_ID!,
  projectSecret: process.env.PROJECT_SECRET!,
  providers: [imessage.config()],
});
const im = imessage(app);

const spaces = new Map<string, Space>(); // sender address -> their 1:1 chat
const queues = new Map<string, Promise<void>>(); // address -> tail of that person's work
const inFlight = new Set<string>(); // outbox ids this process has claimed
let pending: OutboxRow[] = [];

// One task at a time per person, so bursts don't interleave and pushes queue behind replies.
function enqueue(address: string, task: () => Promise<void>) {
  queues.set(address, (queues.get(address) ?? Promise.resolve()).then(task).catch((err) => console.error(err)));
}

async function handleText(space: Space, from: string, body: string) {
  await space.startTyping().catch(() => {}); // cosmetic: a typing failure must not drop the turn
  try {
    const reply = await convex.action(ingestText, { secret, from, body });
    if (reply) await space.send(reply);
    // PLAN also comes as a voice note. The text is already out, so a failure here is only logged.
    if (reply && /^\s*plan\s*$/i.test(body)) {
      await convex
        .action(speakAgent, { secret, text: reply })
        .then((mp3) => space.send(attachment(Buffer.from(mp3, "base64"), { name: "transition-plan.mp3", mimeType: "audio/mpeg" })))
        .catch((err) => console.error(`[voice] ${from}:`, err));
    }
  } catch (err) {
    console.error(`[inbound] ${from}:`, err);
    await space.send("ezworkspace hit a snag — try again in a sec.").catch(console.error);
  } finally {
    await space.stopTyping().catch(() => {});
  }
}

async function deliver(row: OutboxRow) {
  try {
    const space = spaces.get(row.to) ?? (await im.space.create(row.to));
    await space.send(row.body.includes("just signed the ezworkspace Compact") ? effect(row.body, imessage.effect.message.confetti) : row.body);
  } catch (err) {
    console.error(`[outbox] ${row._id} -> ${row.to} failed, retrying in 10s:`, err);
    setTimeout(() => {
      inFlight.delete(row._id);
      drain();
    }, 10_000);
    return;
  }
  // The text is out: keep the id claimed even if markSent fails, so it is never sent twice.
  await convex
    .mutation(outboxMarkSent, { secret, id: row._id })
    .catch((err) => console.error(`[outbox] markSent ${row._id}:`, err));
}

function drain() {
  for (const row of pending) {
    if (inFlight.has(row._id)) continue;
    inFlight.add(row._id);
    enqueue(row.to, () => deliver(row));
  }
}

convex.onUpdate(
  outboxPending,
  { secret },
  (rows) => {
    pending = rows;
    drain();
  },
  (err) => console.error("[outbox] pending query failed:", err),
);

// Phone calls: Photon sends calls on a dedicated line over SIP to a Twilio SIP Domain whose webhook is this
// server. Twilio does speech-to-text and text-to-speech; the words come from the same brain as texts.
const say = (line: string) =>
  `<Say voice="Google.en-US-Neural2-F">${line.replace(/[<>&"']/g, (c) => `&#${c.charCodeAt(0)};`)}</Say>`; // voice-note voice

// A spoken turn waits in the caller's queue, so a call and a text from one person never interleave.
const callTurn = (from: string, body: string) =>
  new Promise<string>((resolve) =>
    enqueue(from, () =>
      convex.action(ingestText, { secret, from, body }).then(
        (reply) => resolve(reply || "Got it."),
        (err) => {
          console.error(`[call] ${from}:`, err);
          resolve("Sorry, I hit a snag. Can you say that again?");
        },
      ),
    ),
  );

async function handleCall(req: Request): Promise<Response> {
  const path = new URL(req.url).pathname;
  if (path !== `/voice/${callToken}`) return new Response(null, { status: 404 });
  const form = await req.formData();
  const from = String(form.get("From")); // a SIP URI such as sip:+15551234567@host
  const digits = /\+?(\d{10,15})/.exec(from)?.[1];
  const speech = String(form.get("SpeechResult") ?? "").trim();
  // Listen after every line. Silence re-prompts once; a second silence ends the call.
  const listen = (line: string, again: boolean) =>
    `<Gather input="speech" speechTimeout="auto">${say(line)}</Gather>` +
    (again ? `<Redirect>${path}</Redirect>` : say("Talk soon. You can text me anytime."));
  let twiml: string;
  if (!digits) {
    console.error("[call] no caller number in From:", from);
    twiml = say("I can't see your number on this call. Please text me instead.");
  } else if (speech) twiml = listen(await callTurn(`+${digits}`, speech), true);
  else if (form.get("CallStatus") === "ringing")
    twiml = listen("Hi, it's ezworkspace, your private AI coach. What's one task that took up your time this week?", true);
  else twiml = listen("I'm still here. Take your time.", false);
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response>${twiml}</Response>`, {
    headers: { "Content-Type": "text/xml" },
  });
}

// idleTimeout: a brain turn can outlast Bun's 10s default; Twilio itself waits 15s.
if (callsOn) Bun.serve({ port: 8787, idleTimeout: 30, fetch: handleCall });

for await (const [space, message] of app.messages) {
  // One masked line per event so dropped messages are visible in the log.
  console.log(`[event] ${message.direction} ${imessage(space).type} ${message.content.type} from=${message.sender?.id ? "..." + message.sender.id.slice(-4) : "none"}`);
  if (message.direction === "outbound") continue;
  if (imessage(space).type !== "dm") continue; // disclosures are private: never ingest or answer in a group
  const content = message.content.type === "reply" ? message.content.content : message.content; // swipe-replies carry text too
  const from = message.sender?.id;
  if (!from) continue;
  if (content.type === "text") {
    spaces.set(from, space);
    enqueue(from, () => handleText(space, from, content.text));
  } else if (content.type === "voice" || (content.type === "attachment" && content.mimeType.startsWith("audio/"))) {
    spaces.set(from, space);
    enqueue(from, () => space.send(VOICE_MEMO_REPLY).then(() => {}));
  }
}
