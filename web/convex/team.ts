import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { DIVIDEND_PCT, payout, sealed, teamMap } from "./lib";
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
    const p = isSealed ? null : payout(logs, team.hourlyCost, compact!.dividendPct, team.company);
    return {
      team: { name: team.name, company: team.company },
      voices,
      quorum: team.quorum,
      compact: compact && {
        signedBy: compact.signedBy,
        signedAt: compact.signedAt,
        dividendPct: compact.dividendPct,
        floorMonths: compact.floorMonths,
      },
      sealed: isSealed,
      plansIssued: isSealed ? null : workers.filter((w) => w.planAt !== undefined).length,
      practiceSessions: isSealed ? null : workers.reduce((sum, w) => sum + (w.practiced ?? 0), 0),
      map: isSealed ? null : teamMap(logs),
      payout: p && {
        quarterlySavings: p.quarterlySavings,
        dividendPct: p.dividendPct,
        feePct: p.feePct,
        steps: p.steps,
      },
    };
  },
});

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
      dividendPct: DIVIDEND_PCT,
      floorMonths: 12,
    });
    // Receipts go to every real worker; seeded demo workers have no phone to buzz.
    const workers = await teamWorkers(ctx, team._id);
    const { perWorker } = payout(await teamLogs(ctx, team._id), team.hourlyCost, DIVIDEND_PCT, team.company);
    for (const w of workers.filter((w) => !w.seeded)) {
      await ctx.db.insert("outbox", {
        to: w.phone,
        sent: !w.phone.startsWith("+"), // web-fallback workers read it in the browser, so iMessage skips it
        body:
          `${team.company} just signed the ezworkspace Compact.\n\n` +
          `Your Automation Dividend: about $${(perWorker.get(w._id) ?? 0).toLocaleString("en-US")} a quarter, ` +
          `your share of the ${DIVIDEND_PCT}% of AI savings that goes to the people who found them. ` +
          `You get paid before ezworkspace earns a cent.\n\n` +
          `No Worker Worse Off: no pay cuts or AI layoffs for 12 months, and nothing you shared can be used against you.\n\n` +
          `Text PLAN for your personal transition plan, or DELETE anytime.`,
      });
    }
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
        `Hi! You're invited to ezworkspace, the private AI transition coach for ${team.company} ${team.name}.\n\n` +
        `Will this be used to cut your job? No. Your team's map stays sealed until ${team.quorum} people join ` +
        `and ${team.company} signs the Compact: nobody ends up worse off, and ${DIVIDEND_PCT}% of what AI saves goes to you.\n\n` +
        `Tell me one thing you do every week and whether you use AI for it, like: ` +
        `"I use ChatGPT to match invoices, it saves me 3 hours a week." Only you see your answers.`,
    });
    return null;
  },
});
