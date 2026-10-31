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

// The demo training every employee can start: the employer already taught it and published it.
const DEMO_SOP = {
  title: "Handle an invoice price mismatch",
  summary: "Use this when an invoice's unit price doesn't match its purchase order (PO), so we never pay the wrong amount.",
  steps: [
    {
      title: "Put the invoice on hold",
      detail: "Open the invoice in the AP system and set it to On hold. Don't pay it until the mismatch is fixed.",
      check: "The invoice shows On hold and isn't in the next payment run.",
    },
    {
      title: "Compare the invoice unit price with the PO",
      detail: "Open the PO and compare the unit price on each line with the invoice. Note which lines differ and by how much.",
      check: "You know every line that differs and the total difference.",
    },
    {
      title: "Check the receiving record",
      detail: "Look up the receiving record for this PO. We only pay for goods the warehouse marked as received.",
      check: "The quantities you'd pay for match what was received.",
    },
    {
      title: "Email the vendor with the price-mismatch template",
      detail: "Send the template: the invoice shows one unit price, the PO shows another, so please send a corrected invoice or a credit memo.",
      check: "Your email names the invoice number, the PO number and both prices.",
    },
    {
      title: "Escalate differences over $5,000 to the AP lead",
      detail: "If the total difference is over $5,000, tell the AP lead before you go further with the vendor.",
      check: "Any difference over $5,000 has the AP lead's okay.",
    },
    {
      title: "Log the exception and release once corrected",
      detail: "Add it to the AP exception log with the invoice number, PO number, mismatch type, amount and next step. Release the invoice only when the corrected invoice or credit memo matches the PO.",
      check: "The log entry is complete, and the invoice is released only after it matches.",
    },
  ],
};

// Three more basic AP trainings so the demo shows a real training library.
const EXTRA_SOPS = [
  {
    title: "Enter a new vendor invoice",
    summary: "Use this for every new invoice, so it's paid once, on time, against the right PO.",
    steps: [
      { title: "Check it's not a duplicate", detail: "Search the AP system for the vendor and invoice number before you enter anything.", check: "No invoice with the same vendor and number exists." },
      { title: "Match it to the PO", detail: "Find the PO number on the invoice and open that PO.", check: "The vendor, items and quantities match the PO." },
      { title: "Let AI read the fields", detail: "Upload the PDF and let AI fill in vendor, date, amounts and line items. You check every field it fills.", check: "Every AI-filled field matches the paper or PDF." },
      { title: "Code the expense", detail: "Use the GL code from the PO. Ask the AP lead if the PO has none.", check: "The GL code matches the PO." },
      { title: "Send it for approval", detail: "Route it to the budget owner on the PO.", check: "The invoice shows Pending approval with the right approver." },
    ],
  },
  {
    title: "Answer a \"where's my payment?\" email with AI",
    summary: "Use this when a vendor asks about a payment, so they get a fast, accurate answer.",
    steps: [
      { title: "Find the invoice", detail: "Look up the vendor's invoice number in the AP system.", check: "You have the invoice and its status." },
      { title: "Check the payment status", detail: "Note whether it's paid, scheduled, on hold or waiting for approval, and the date.", check: "You know the status and the next date." },
      { title: "Let AI draft the reply", detail: "Ask AI to draft a short, friendly reply with the status and date. Don't paste bank details into AI.", check: "The draft has the right invoice number, status and date." },
      { title: "Review and send", detail: "Read the draft, fix anything wrong, and send it from your own email.", check: "You checked every fact before sending." },
      { title: "Log the contact", detail: "Add a note to the vendor record so the team sees the question was answered.", check: "The note is saved with today's date." },
    ],
  },
  {
    title: "Month-end accrual checklist",
    summary: "Use this at month end, so received-but-not-billed costs land in the right month.",
    steps: [
      { title: "Pull the received-not-invoiced report", detail: "Run the report for the month that's closing.", check: "The report covers the whole month." },
      { title: "Let AI group the lines", detail: "Ask AI to group the lines by vendor and GL code and total them. You check the totals.", check: "AI's totals match the report total." },
      { title: "Check anything over $10,000", detail: "Confirm large items with the budget owner before accruing.", check: "Every item over $10,000 is confirmed." },
      { title: "Book the accrual entry", detail: "Enter the journal entry with the month-end date and a clear memo.", check: "The entry balances and has a memo." },
      { title: "Set the reversal", detail: "Mark the entry to reverse on the first day of next month.", check: "The reversal date is the 1st of next month." },
    ],
  },
];

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
  for (const table of ["trainings", "sops", "outbox", "compacts", "playbooks", "knowledge", "logs", "workers", "teams"] as const) {
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
  // Oldest first so the price-mismatch training stays on top of the newest-first list.
  for (const [i, sop] of [...EXTRA_SOPS, DEMO_SOP].entries()) {
    await ctx.db.insert("sops", { teamId, ...sop, source: "text", published: true, createdAt: Date.now() - (10 - i) * 60_000 });
  }
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
