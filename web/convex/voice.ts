import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import { action } from "./_generated/server";
import { assertAgent } from "./util";

// Web chat: reads a reply aloud. Returns base64 MP3.
// shortcut: no rate limit on this public action; add @convex-dev/rate-limiter before real users
export const speak = action({
  args: { deviceId: v.string(), text: v.string() },
  handler: async (ctx, { deviceId, text }): Promise<string> => {
    if (!(await ctx.runQuery(internal.workers.exists, { phone: `web:${deviceId}` }))) {
      throw new ConvexError("Send a message first.");
    }
    return await synthesize(text);
  },
});

// iMessage agent: the PLAN reply as a voice note. Returns base64 MP3.
export const speakAgent = action({
  args: { secret: v.string(), text: v.string() },
  handler: async (_ctx, { secret, text }): Promise<string> => {
    assertAgent(secret);
    return await synthesize(text);
  },
});

// Google Cloud Text-to-Speech.
async function synthesize(text: string): Promise<string> {
  if (!text.trim() || text.length > 900) throw new ConvexError("Text must be 1-900 characters.");
  const key = process.env.GOOGLE_TTS_API_KEY;
  if (!key) throw new ConvexError("Set GOOGLE_TTS_API_KEY in Convex first.");
  const res = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      input: { text },
      voice: { languageCode: "en-US", name: "en-US-Neural2-F" },
      audioConfig: { audioEncoding: "MP3" },
    }),
  });
  if (!res.ok) throw new ConvexError(`Text-to-speech failed (${res.status}).`);
  const { audioContent } = (await res.json()) as { audioContent?: string };
  if (!audioContent) throw new ConvexError("Text-to-speech returned no audio.");
  return audioContent;
}
