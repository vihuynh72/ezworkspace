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

for await (const [space, message] of app.messages) {
  if (message.direction === "outbound") continue;
  if (imessage(space).type !== "dm") continue; // disclosures are private: never ingest or answer in a group
  const content = message.content.type === "reply" ? message.content.content : message.content; // swipe-replies carry text too
  const from = message.sender?.id;
  if (content.type !== "text" || !from) continue;
  spaces.set(from, space);
  enqueue(from, () => handleText(space, from, content.text));
}
