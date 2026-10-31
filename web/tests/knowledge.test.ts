import { expect, test } from "bun:test";
import { chunks, pick } from "../convex/knowledge";

const sop = {
  title: "AP exception handling SOP",
  text: "Use this when an invoice does not match its PO.\n3. Check the unit price. Compare the invoice unit price with the PO unit price.\n6. If the difference is over $5,000, escalate to the AP lead.",
};
const other = { title: "Holiday calendar", text: "The office closes on public holidays. Payroll runs a day early." };

test("the coach gets the SOP chunk that shares the most words with the question, with its title", () => {
  const got = pick([other, sop], "how do I handle an invoice where the prices are different from the PO?");
  expect(got).toHaveLength(1);
  expect(got[0].title).toBe("AP exception handling SOP");
  expect(got[0].text).toContain("unit price");
  expect(pick([sop], "when do I escalate?")[0]?.text).toContain("$5,000"); // "escalate" meets "escalation" too
});

test("no overlap, no sources: small talk gets no SOP", () => {
  expect(pick([sop, other], "hi there")).toEqual([]);
  expect(pick([], "invoice price")).toEqual([]);
});

test("at most 2 snippets, each chunk at most 800 characters and cut at a line break when it can", () => {
  const long = { title: "Big guide", text: Array.from({ length: 40 }, (_, i) => `Step ${i}: match the invoice price to the PO line.`).join("\n") };
  const c = chunks(long.text);
  expect(c.length).toBeGreaterThan(1);
  for (const x of c) expect(x.length).toBeLessThanOrEqual(800);
  expect(c.join("")).toBe(long.text); // nothing is lost between chunks
  expect(chunks("x".repeat(2000)).map((x) => x.length)).toEqual([800, 800, 400]);
  expect(pick([long, sop], "invoice price PO")).toHaveLength(2);
});
