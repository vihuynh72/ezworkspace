import Anthropic from "@anthropic-ai/sdk";
import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import { action, type ActionCtx } from "./_generated/server";
import { assertAgent } from "./util";

const TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
type ImageType = (typeof TYPES)[number];
const MAX_BYTES = 4 * 1024 * 1024;

const SYSTEM = `You are ezworkspace, a private AI coach. You help one worker move their everyday tasks into AI-era workflows. They sent a photo of their work, maybe with a note.
Coach in three short parts, as plain text:
Show: what an AI tool could do with this. For an invoice and a PO: match the lines, totals and dates, and flag what differs.
Try: one small thing they can try with AI on it today.
Review: what they must still check themselves before anything goes out.
End with one next step.
Short, simple sentences. At most 90 words. No markdown.
Never copy names, account numbers, addresses, amounts or other personal details from the photo. Say "the vendor" or "the total" instead.
If the photo is not work, say kindly what kind of photo helps, then give one next step.`;

// Web chat: coaches on one photo. Nothing from the photo is stored or logged.
// shortcut: no rate limit on this public action; add @convex-dev/rate-limiter before real users
export const coach = action({
  args: { deviceId: v.string(), imageBase64: v.string(), mimeType: v.string(), note: v.optional(v.string()) },
  handler: async (ctx, { deviceId, imageBase64, mimeType, note }): Promise<string> => {
    const phone = `web:${deviceId}`;
    if (!(await ctx.runQuery(internal.workers.exists, { phone }))) throw new ConvexError("Send a message first.");
    return await coachPhoto(ctx, phone, imageBase64, mimeType, note);
  },
});

// iMessage agent: a photo someone texted. Returns the reply to send back.
export const visionAgent = action({
  args: { secret: v.string(), from: v.string(), imageBase64: v.string(), mimeType: v.string() },
  handler: async (ctx, { secret, from, imageBase64, mimeType }): Promise<string> => {
    assertAgent(secret);
    return await coachPhoto(ctx, from, imageBase64, mimeType);
  },
});

async function coachPhoto(ctx: ActionCtx, phone: string, data: string, mimeType: string, note?: string) {
  if (!TYPES.includes(mimeType as ImageType)) throw new ConvexError("Send a JPEG, PNG, WebP or GIF photo.");
  if (!data || data.length * 0.75 > MAX_BYTES) throw new ConvexError("Photos must be under 4 MB.");
  if (note && note.length > 500) throw new ConvexError("Keep the note under 500 characters.");
  if (!process.env.ANTHROPIC_API_KEY) throw new ConvexError("Photo coaching is off right now.");
  const res = await new Anthropic().beta.messages
    .create({
      model: "claude-opus-5-5",
      max_tokens: 1000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low" },
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mimeType as ImageType, data } },
            { type: "text", text: note?.trim() || "What can AI help me with here?" },
          ],
        },
      ],
    })
    .catch((e: unknown) => {
      console.error("Claude vision failed", e instanceof Error ? e.message : e); // never the photo
      throw new ConvexError("I couldn't read that photo just now. Try again.");
    });
  const block = res.content.find((b) => b.type === "text");
  if (res.stop_reason === "refusal" || block?.type !== "text" || !block.text.trim()) {
    throw new ConvexError("I couldn't read that photo. Try another one.");
  }
  // A coached photo counts as one practice session, like TRY. Only the count is kept.
  const { workerId } = await ctx.runMutation(internal.workers.begin, { phone });
  await ctx.runMutation(internal.workers.endTry, { workerId, practiced: true });
  return block.text.trim();
}
