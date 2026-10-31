import { ConvexError } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";

// Only the iMessage agent (which holds AGENT_SECRET) may call the agent-facing functions.
export const assertAgent = (secret: string) => {
  if (!process.env.AGENT_SECRET || secret !== process.env.AGENT_SECRET) throw new Error("Unauthorized");
};

export async function requireCoo(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError("Sign in as the COO first.");
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
