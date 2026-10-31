import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

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
    dividendPct: v.number(),
    floorMonths: v.number(),
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
