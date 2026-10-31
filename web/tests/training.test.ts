import { expect, test } from "bun:test";
import { isDone, stepLine } from "../convex/training";

test("spoken or typed 'done' moves the step on; questions and doubts never do", () => {
  for (const m of ["done", "Done.", "I did it!", "ok done", "I'm done", "finished", "Next step"]) expect(isDone(m)).toBe(true);
  for (const m of ["is it done?", "not done yet", "how do I put it on hold?", "", "done with what?"]) expect(isDone(m)).toBe(false);
});

test("the fallback step line names the step, what to do and the check", () => {
  const sop = {
    title: "Handle an invoice price mismatch",
    summary: "",
    steps: [
      { title: "Put the invoice on hold.", detail: "Set it to On hold.", check: "It shows On hold." },
      { title: "Compare prices", detail: "Compare the unit price.", check: "You know the difference." },
    ],
  };
  expect(stepLine(sop, 1)).toBe("Step 1 of 2: Put the invoice on hold. Set it to On hold. Check: It shows On hold.");
  expect(stepLine(sop, 2)).toStartWith("Step 2 of 2: Compare prices.");
});
