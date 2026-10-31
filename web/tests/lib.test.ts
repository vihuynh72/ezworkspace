import { expect, test } from "bun:test";
import { payout, sealed, teamMap } from "../convex/lib";

const log = (workerId: string, category: string, minutesPerWeek: number, extra = {}) => ({
  workerId, task: `${category} task`, category, minutesPerWeek, keepHuman: false, originator: false, ...extra,
});

test("map stays sealed until quorum AND a signed Compact", () => {
  expect(sealed(4, 5, true)).toBe(true);
  expect(sealed(5, 5, false)).toBe(true);
  expect(sealed(5, 5, true)).toBe(false);
});

test("categories with fewer than 3 people are hidden, and so are their keep-human tasks", () => {
  const m = teamMap([
    log("a", "Big", 60), log("b", "Big", 60), log("c", "Big", 60),
    log("a", "Small", 600), log("b", "Small", 0, { keepHuman: true, task: "secret task" }),
  ]);
  expect(m.categories.map((c) => c.category)).toEqual(["Big"]);
  expect(m.hiddenCategories).toBe(1);
  expect(m.keepList).not.toContain("secret task");
});

test("payout order: workers first, fee on top, company keeps the rest", () => {
  const p = payout([log("a", "X", 600, { originator: true }), log("b", "X", 600)], 48, 30, "Acme");
  const [workers, fee, company] = p.steps;
  expect(p.steps.map((s) => s.kind)).toEqual(["workers", "fee", "company"]);
  expect(workers.amount).toBe(Math.round(p.quarterlySavings * 0.3));
  expect(fee.amount).toBe(Math.round(workers.amount * 0.1));
  expect(workers.amount + fee.amount + company.amount).toBe(p.quarterlySavings);
  expect(p.perWorker.get("a")!).toBeGreaterThan(p.perWorker.get("b")!);
});
