import { expect, test } from "bun:test";
import { command, guess } from "../convex/ingest";
import { PATHS, nextStep, progressLine, progressOf, readiness, suggest } from "../convex/paths";

test("a step finishes only on the kind of turn it asks for", () => {
  expect(nextStep("transition", 1, "log")).toBe(2);
  expect(nextStep("transition", 1, "plan")).toBe(1);
  expect(nextStep("transition", 3, "try")).toBe(4);
  expect(nextStep("newhire", 2, null)).toBe(2);
  expect(nextStep("transition", 6, "log")).toBe(6); // finished stays finished
});

test("every reply ends with one spoken next step, and says when a step is done", () => {
  expect(suggest("transition", 3, false)).toBe(PATHS.transition[2].ask);
  expect(suggest("transition", 2, true)).toBe(`That's step 1 of 5 done. ${PATHS.transition[1].ask}`);
  expect(suggest("newhire", 4, true)).toStartWith("That's all 3 steps done!");
  for (const step of [...PATHS.transition, ...PATHS.newhire]) expect(step.ask.length).toBeLessThanOrEqual(280);
});

test("readiness is team totals only: groups of 1-2 hidden, 0 and 3 shown", () => {
  const r = readiness([{}, {}, { track: "transition", step: 3 }, { track: "newhire", step: 2 }, { track: "transition", step: 6 }]);
  expect(r).toEqual({ onTransition: 3, onNewHire: null, completed: null });
  expect(readiness([]).onNewHire).toBe(0);
});

test("without Claude, plain words still reach the right step", () => {
  expect(guess("make me a plan")).toBe("plan");
  expect(guess("let me practice")).toBe("try");
  expect(guess("I’m new here")).toBe("new_hire");
  expect(guess("what's next?")).toBe("next");
  expect(guess("I type in paper invoices, 2 hours a week")).toBe("log");
  expect(guess("is my boss going to see this?")).toBe("question");
  expect(guess("hi")).toBe("greeting");
  expect(guess("How am I doing?")).toBe("progress");
});

test("commands survive speech-to-text case and punctuation", () => {
  expect(["Plan.", " STOP! ", "share?", "Delete...", "'Try'", "Forget me."].map(command)).toEqual([
    "plan", "stop", "share", "delete", "try", "forget me",
  ]);
  expect(command("plan my week")).toBe("plan my week"); // only whole-message commands match
});

test("progress is the worker's own numbers, and the summary says them plainly", () => {
  const p = progressOf({ track: "newhire", step: 2, skills: ["a", "b", "c", "d", "e", "f"] }, [{ minutesPerWeek: 120 }, { minutesPerWeek: 30 }]);
  expect(p).toEqual({ hoursPerWeek: 2.5, skills: ["b", "c", "d", "e", "f"], track: "new_hire", step: 2, steps: 3 });
  expect(progressOf({}, []).track).toBeNull();
  expect(progressLine({ ...p, skills: [] })).toBe("AI saves you about 2.5 hours a week. No skills practiced yet. You're on step 2 of 3.");
});
