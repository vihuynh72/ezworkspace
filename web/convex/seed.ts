import { internalMutation, mutation, type MutationCtx } from "./_generated/server";
import { requireCoo } from "./util";

// The team's own SOP, so the coach's answers cite something real.
const AP_SOP = `AP exception handling SOP
Use this when an invoice does not match its purchase order (PO).
1. Put the invoice on hold. Do not pay it until the mismatch is fixed.
2. Check the quantity. Compare the invoice quantity with the PO and the receiving record.
3. Check the unit price. Compare the invoice unit price with the PO unit price.
4. Check the receiving record. Pay only for goods the warehouse marked as received.
5. Email the vendor with the template: "Hi, invoice [number] does not match PO [number]. The invoice shows [quantity or unit price], but the PO shows [quantity or unit price]. Please send a corrected invoice or a credit memo."
6. If the difference is over $5,000, escalate to the AP lead before you reply to the vendor.
7. Log the exception in the AP exception log: invoice number, PO number, type of mismatch, amount and next step.
8. Release the invoice for payment only when the corrected invoice or credit memo matches the PO.`;

// 4 seeded voices so the judge's text is the 5th. "Exception emails" starts at 2 people (hidden),
// so a judge who texts about emails makes a hidden category appear.
const SEED = [
  [
    { task: "Match invoices to POs with ChatGPT", category: "Invoice matching", tool: "ChatGPT", minutesPerWeek: 240, keepHuman: false, originator: true },
    { task: "Calm vendors on dispute calls", category: "Vendor calls", tool: null, minutesPerWeek: 0, keepHuman: true, originator: false },
  ],
  [
    { task: "Copilot pulls invoice fields from PDFs", category: "Data entry", tool: "Copilot", minutesPerWeek: 180, keepHuman: false, originator: true },
    { task: "Three-way match spot checks", category: "Invoice matching", tool: null, minutesPerWeek: 90, keepHuman: false, originator: false },
    { task: "Negotiate payment plans", category: "Vendor calls", tool: null, minutesPerWeek: 0, keepHuman: true, originator: false },
  ],
  [
    { task: "Flag duplicate invoices", category: "Invoice matching", tool: null, minutesPerWeek: 120, keepHuman: false, originator: false },
    { task: "Re-key vendor bank details", category: "Data entry", tool: null, minutesPerWeek: 60, keepHuman: false, originator: false },
    { task: "Gemini drafts exception emails", category: "Exception emails", tool: "Gemini", minutesPerWeek: 100, keepHuman: false, originator: true },
    { task: "Relationship check-ins with key vendors", category: "Vendor calls", tool: null, minutesPerWeek: 0, keepHuman: true, originator: false },
  ],
  [
    { task: "Type in paper invoices", category: "Data entry", tool: null, minutesPerWeek: 120, keepHuman: false, originator: false },
    { task: "Chase missing POs by email", category: "Exception emails", tool: null, minutesPerWeek: 80, keepHuman: false, originator: false },
    { task: "Month-end accrual spreadsheet", category: "Month-end reporting", tool: null, minutesPerWeek: 150, keepHuman: false, originator: false },
  ],
];

async function reseed(ctx: MutationCtx) {
  for (const table of ["outbox", "compacts", "playbooks", "knowledge", "logs", "workers", "teams"] as const) {
    for await (const doc of ctx.db.query(table)) await ctx.db.delete(table, doc._id);
  }
  const teamId = await ctx.db.insert("teams", {
    name: "Accounts Payable",
    company: "Acme Insurance",
    quorum: 5,
    hourlyCost: 48,
  });
  await ctx.db.insert("knowledge", {
    teamId, title: "AP exception handling SOP", kind: "text", text: AP_SOP, chars: AP_SOP.length, addedAt: Date.now(),
  });
  const ids = [];
  for (const [i, logs] of SEED.entries()) {
    const workerId = await ctx.db.insert("workers", { teamId, phone: `+1555000000${i + 1}`, seeded: true });
    for (const log of logs) await ctx.db.insert("logs", { teamId, workerId, ...log });
    ids.push(workerId);
  }
  // One teammate's shortcut, already shared up and learned by two others; one admin idea not sent yet.
  await ctx.db.insert("playbooks", {
    teamId,
    title: "Match invoices to POs with ChatGPT",
    category: "Invoice matching",
    steps: [
      "Paste the invoice line and the PO line",
      "Ask AI to list every mismatch",
      "Check each flag yourself",
      "Send the exception email",
    ],
    source: "worker",
    originatorId: ids[0],
    adopters: 2,
    published: true,
  });
  await ctx.db.insert("playbooks", {
    teamId,
    title: "Draft exception emails with AI",
    category: "Exception emails",
    steps: [
      "Paste the facts: invoice number, amount, what's missing",
      "Ask AI for a short, polite draft",
      "Check the numbers and the tone yourself",
      "Send it from your own inbox",
    ],
    source: "admin",
    adopters: 0,
    published: false,
  });
  return null;
}

// CLI: npx convex run seed:run
export const run = internalMutation({ args: {}, handler: reseed });

export const reset = mutation({
  args: {},
  handler: async (ctx) => {
    await requireCoo(ctx);
    return reseed(ctx);
  },
});
