import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const trackValidator = v.union(v.literal("transition"), v.literal("newhire"));

export default defineSchema({
  teams: defineTable({
    name: v.string(),
    company: v.string(),
    quorum: v.number(),
    hourlyCost: v.number(), // loaded $/hour, used to value time saved
  }),
  // A worker is only a phone number. No public query returns these rows.
  workers: defineTable({
    teamId: v.id("teams"),
    phone: v.string(),
    seeded: v.boolean(),
    planAt: v.optional(v.number()), // when this worker last got a transition plan
    mode: v.optional(v.literal("try")), // "try": their next text is a practice example, used once and never stored
    practiced: v.optional(v.number()), // TRY sessions finished
    track: v.optional(trackValidator), // guided path (convex/paths.ts); unset means transition
    step: v.optional(v.number()), // 1-based step on that path; past the last step means finished
    memory: v.optional(v.string()), // the coach's private notes on this worker; only their own prompts read it
    skills: v.optional(v.array(v.string())), // up to 5 practiced tasks and adopted team workflows
  })
    .index("by_phone", ["phone"])
    .index("by_team", ["teamId"]),
  logs: defineTable({
    teamId: v.id("teams"),
    workerId: v.id("workers"),
    task: v.string(),
    category: v.string(),
    tool: v.union(v.string(), v.null()),
    minutesPerWeek: v.number(), // minutes AI saves per week; 0 for keep-human tasks
    keepHuman: v.boolean(),
    originator: v.boolean(), // the worker came up with this AI shortcut themselves
  })
    .index("by_team", ["teamId"])
    .index("by_worker", ["workerId"]),
  compacts: defineTable({
    teamId: v.id("teams"),
    signedBy: v.string(),
    signedAt: v.number(),
    dividendPct: v.optional(v.number()), // legacy, no longer written
    floorMonths: v.number(),
  }).index("by_team", ["teamId"]),
  // Team workflows: shared up by a worker (name kept private) or added by the admin.
  playbooks: defineTable({
    teamId: v.id("teams"),
    title: v.string(),
    category: v.string(),
    steps: v.array(v.string()),
    source: v.union(v.literal("worker"), v.literal("admin")),
    originatorId: v.optional(v.id("workers")), // never returned to the employer
    adopters: v.number(),
    published: v.boolean(),
  }).index("by_team", ["teamId"]),
  outbox: defineTable({
    to: v.string(),
    body: v.string(),
    sent: v.boolean(),
  })
    .index("by_sent", ["sent"])
    .index("by_to", ["to"]),
  // Public registry of Compact signers, kept honest by a Firecrawl search of WARN/layoff notices.
  registry: defineTable({
    company: v.string(),
    status: v.union(v.literal("clear"), v.literal("pending_review")),
    evidence: v.array(v.object({ title: v.string(), url: v.string() })),
    checkedAt: v.number(),
  }).index("by_company", ["company"]),
});
