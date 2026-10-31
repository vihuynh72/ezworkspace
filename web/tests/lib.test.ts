import { expect, test } from "bun:test";
import { sealed, teamMap, value, VALUE_SOURCES } from "../convex/lib";

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

test("value: hours AI saves, its share of team time, and a quarter of it at the loaded rate", () => {
  const v = value([log("a", "X", 600), log("b", "X", 300, { originator: true })], 5, 48);
  expect(v.hoursPerWeek).toBe(15);
  expect(v.teamHoursPerWeek).toBe(200);
  expect(v.aiShare).toBe(0.075);
  expect(v.quarterlyValue).toBe(15 * 48 * 13);
  // Replacing an AP clerk costs 0.5-2x the $49,210 median salary.
  expect([v.replaceCostLow, v.replaceCostHigh, v.bootcampCost]).toEqual([24605, 98420, 14000]);
  expect(VALUE_SOURCES).toHaveLength(3);
});

test("value never divides by zero or passes 100% of team time", () => {
  expect(value([], 0, 48)).toMatchObject({ hoursPerWeek: 0, aiShare: 0, quarterlyValue: 0 });
  expect(value([log("a", "X", 6000)], 1, 48).aiShare).toBe(1);
  expect(value([log("a", "X", 100)], 3, 48).aiShare).toBe(0.014); // 1.7 / 120, 3 decimals
});
