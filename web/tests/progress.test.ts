import { expect, test } from "bun:test";
import { isOnTrack, template, xpOf } from "../convex/progress";

test("XP: 10 per log, 25 per practice, 40 per plan, 30 per team workflow, 100 per level", () => {
  expect(xpOf({ logs: 0, practiced: 0, plans: 0, learned: 0 })).toEqual({ xp: 0, level: 1, nextLevelXp: 100 });
  expect(xpOf({ logs: 1, practiced: 1, plans: 1, learned: 1 })).toEqual({ xp: 105, level: 2, nextLevelXp: 200 });
  expect(xpOf({ logs: 10, practiced: 0, plans: 0, learned: 0 }).level).toBe(2); // exactly 100 XP is level 2
});

test("on track: halfway along the path, or one team workflow learned", () => {
  expect(isOnTrack({}, [])).toBe(false);
  expect(isOnTrack({ track: "transition", step: 3 }, [])).toBe(true);
  expect(isOnTrack({ track: "newhire", step: 2 }, [])).toBe(true);
  expect(isOnTrack({ skills: ["Match invoices"] }, ["Match invoices"])).toBe(true);
  expect(isOnTrack({ skills: ["Match invoices"] }, [])).toBe(false); // a practiced task alone isn't a team workflow
});

test("without Claude, 2-3 suggestions of at most 140 characters", () => {
  const long = "x".repeat(200);
  const none = [{ name: "First log", earned: false }];
  for (const s of [
    template([], none, []),
    template([{ title: long }], [], [{ task: long, keepHuman: false }]),
    template([], [{ name: "First log", earned: true }, { name: "First practice", earned: true }, { name: "Has a plan", earned: true }], []),
  ]) {
    expect(s.length).toBeGreaterThanOrEqual(2);
    expect(s.length).toBeLessThanOrEqual(3);
    for (const line of s) expect(line.length).toBeLessThanOrEqual(140);
  }
});
