import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx } from "./_generated/server";
import { MIN_GROUP, sealed, teamMap, value, VALUE_SOURCES } from "./lib";
import { readiness, suggest } from "./paths";
import { isOnTrack } from "./progress";
import { getTeam, requireCoo, teamCompact, teamLogs, teamWorkers } from "./util";

// The only read the employer gets. Nothing per-person ever leaves this function.
export const overview = query({
  args: {},
  handler: async (ctx) => {
    if (!(await ctx.auth.getUserIdentity())) return null;
    const team = await ctx.db.query("teams").first();
    if (!team) return null;
    const workers = await teamWorkers(ctx, team._id);
    const voices = workers.length;
    const compact = await teamCompact(ctx, team._id);
    const isSealed = sealed(voices, team.quorum, compact !== null);
    const logs = isSealed ? [] : await teamLogs(ctx, team._id);
    const playbooks = isSealed
      ? null
      : await ctx.db.query("playbooks").withIndex("by_team", (q) => q.eq("teamId", team._id)).order("desc").take(50);
    return {
      team: { name: team.name, company: team.company },
      voices,
      quorum: team.quorum,
      compact: compact && {
        signedBy: compact.signedBy,
        signedAt: compact.signedAt,
        floorMonths: compact.floorMonths,
      },
      sealed: isSealed,
      plansIssued: isSealed ? null : workers.filter((w) => w.planAt !== undefined).length,
      practiceSessions: isSealed ? null : workers.reduce((sum, w) => sum + (w.practiced ?? 0), 0),
      // Counts per guided path; 1-2 people show as null ("under 3"), never per person.
      readiness: isSealed ? null : readiness(workers),
      teamOnTrack: isSealed || voices < MIN_GROUP ? null : teamOnTrack(workers, playbooks ?? []),
      map: isSealed ? null : teamMap(logs),
      value: isSealed ? null : { ...value(logs, voices, team.hourlyCost), sources: VALUE_SOURCES },
      // Who shared a workflow stays private: originatorId never leaves the server.
      playbooks:
        playbooks &&
        playbooks.map(({ _id, title, category, steps, source, adopters, published }) => ({
          _id, title, category, steps, source, adopters, published,
        })),
    };
  },
});

// How many workers are on track, as one team count. Never which ones.
function teamOnTrack(workers: Doc<"workers">[], playbooks: Doc<"playbooks">[]) {
  const published = playbooks.filter((p) => p.published).map((p) => p.title);
  return { onTrack: workers.filter((w) => isOnTrack(w, published)).length, total: workers.length };
}

export const signCompact = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await requireCoo(ctx);
    const team = await getTeam(ctx);
    if (await teamCompact(ctx, team._id)) return null;
    await ctx.db.insert("compacts", {
      teamId: team._id,
      signedBy: identity.name ?? identity.email ?? "COO",
      signedAt: Date.now(),
      floorMonths: 12,
    });
    await tellTeam(
      ctx,
      team._id,
      `${team.company} signed the ezworkspace Compact. No pay cuts or AI layoffs for 12 months, and paid time to learn. Text PLAN for your plan.`,
    );
    return null;
  },
});

export const invite = mutation({
  args: { phone: v.string() },
  handler: async (ctx, { phone }) => {
    await requireCoo(ctx);
    const team = await getTeam(ctx);
    const digits = phone.replace(/[^\d]/g, "");
    const to = phone.trim().startsWith("+") ? `+${digits}` : digits.length === 10 ? `+1${digits}` : `+${digits}`;
    if (!/^\+\d{10,15}$/.test(to)) throw new ConvexError("Enter a phone number like +1 415 555 0123.");
    await ctx.db.insert("outbox", {
      to,
      sent: false,
      body:
        `Hi! You're invited to ezworkspace, a private AI coach for ${team.company} ${team.name}. ` +
        `Will this be used to cut your job? No, and only you see what you tell me. ${suggest("transition", 1, false)}`,
    });
    return null;
  },
});

// A worker's shared shortcut becomes a team workflow; every teammate gets a text inviting them to learn it.
export const publishPlaybook = mutation({
  args: { playbookId: v.id("playbooks") },
  handler: async (ctx, { playbookId }) => {
    await requireCoo(ctx);
    const pb = await ctx.db.get("playbooks", playbookId);
    if (!pb) throw new ConvexError("That workflow is gone. Refresh the page.");
    if (pb.published) return null;
    await ctx.db.patch("playbooks", playbookId, { published: true });
    await tellTeam(ctx, pb.teamId, `New team workflow: ${pb.title}. Want to learn it in 2 minutes? Reply TRY.`);
    return null;
  },
});

// Texts every real worker; seeded demo workers have no phone to buzz.
export async function tellTeam(ctx: MutationCtx, teamId: Id<"teams">, body: string) {
  for (const w of (await teamWorkers(ctx, teamId)).filter((w) => !w.seeded)) {
    // web-fallback workers read it in the browser, so iMessage skips it
    await ctx.db.insert("outbox", { to: w.phone, sent: !w.phone.startsWith("+"), body });
  }
}
