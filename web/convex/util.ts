import Anthropic from "@anthropic-ai/sdk";
import { ConvexError } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";

// Only the iMessage agent (which holds AGENT_SECRET) may call the agent-facing functions.
export const assertAgent = (secret: string) => {
  if (!process.env.AGENT_SECRET || secret !== process.env.AGENT_SECRET) throw new Error("Unauthorized");
};

export async function requireCoo(ctx: Pick<QueryCtx, "auth">) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError("Sign in as the employer first.");
  return identity;
}

export async function getTeam(ctx: QueryCtx) {
  const team = await ctx.db.query("teams").first();
  if (!team) throw new ConvexError("No demo team yet. Click Reset demo.");
  return team;
}

// shortcut: reads whole rows to count; fine for one demo team, use @convex-dev/aggregate for real tenants
export const teamWorkers = (ctx: QueryCtx, teamId: Id<"teams">) =>
  ctx.db.query("workers").withIndex("by_team", (q) => q.eq("teamId", teamId)).take(1000);

export const teamLogs = (ctx: QueryCtx, teamId: Id<"teams">) =>
  ctx.db.query("logs").withIndex("by_team", (q) => q.eq("teamId", teamId)).take(5000);

export const teamCompact = (ctx: QueryCtx, teamId: Id<"teams">) =>
  ctx.db.query("compacts").withIndex("by_team", (q) => q.eq("teamId", teamId)).first();

// A screen frame as base64 (any data: prefix dropped). The UI sends <=300 KB JPEGs; 1 MB leaves headroom.
export function imageData(b64: string) {
  const data = b64.replace(/^data:[^,]*,/, "");
  if (!data || data.length * 0.75 > 1024 * 1024) throw new ConvexError("Each screenshot must be under 1 MB.");
  return data;
}

// Canvas defaults to PNG, so the type comes from the bytes rather than trusting the caller.
const mediaType = (b64: string): "image/png" | "image/webp" | "image/gif" | "image/jpeg" =>
  b64.startsWith("iVBOR") ? "image/png" : b64.startsWith("UklGR") ? "image/webp" : b64.startsWith("R0lGOD") ? "image/gif" : "image/jpeg";

// One structured Claude call (images first, then the JSON), or null when there's no key or Claude refuses.
export async function claude<T>(system: string, schema: Record<string, unknown>, user: unknown, images: string[] = []): Promise<T | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  const res = await new Anthropic().beta.messages.create({
    model: "claude-opus-5-5",
    max_tokens: 4000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low", format: { type: "json_schema", schema } },
    system,
    messages: [
      {
        role: "user",
        content: [
          ...images.map((data) => ({ type: "image" as const, source: { type: "base64" as const, media_type: mediaType(data), data } })),
          { type: "text" as const, text: JSON.stringify(user) },
        ],
      },
    ],
  });
  const block = res.content.find((b) => b.type === "text");
  if (res.stop_reason === "refusal" || block?.type !== "text") return null;
  return JSON.parse(block.text) as T;
}
