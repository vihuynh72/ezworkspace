// The guided paths. Pure, so tests/paths.test.ts can check them without a database.
import { MIN_GROUP } from "./lib";

export type Track = "transition" | "newhire";
export type Done = "log" | "try" | "plan";
type Progress = { track?: Track; step?: number };

// Each step is finished by one kind of turn (a work log, a TRY practice, a PLAN), and its ask is
// the one spoken sentence that suggests it at the end of a reply.
export const PATHS: Record<Track, { done: Done; ask: string }[]> = {
  // Veteran staff moving into AI-assisted work. Everyone starts here unless they say they're new.
  transition: [
    { done: "log", ask: `To start, tell me one task that eats your time, like "I match invoices to POs, about 5 hours a week," or tell me if you're new here.` },
    { done: "log", ask: "What's one part of your job you want to keep doing yourself, like the vendor calls?" },
    { done: "try", ask: `Want to watch AI do a piece of your work, right here? Just say "let me practice."` },
    { done: "plan", ask: `You've done the hard part. Want your plan? Just say "make me a plan."` },
    { done: "log", ask: "This week, let AI help with one task from your plan, then tell me how it went and how much time it saved." },
  ],
  newhire: [
    { done: "log", ask: "Which task have you been given first?" },
    { done: "try", ask: `Want to watch AI do that task with you? Just say "let me practice."` },
    { done: "plan", ask: `Want your first-month plan? Just say "make me a plan."` },
  ],
};
const FINISHED = "Tell me whenever AI helps with another task, so the time it saves counts for you.";

export const pathOf = (w: Progress | null) => ({ track: w?.track ?? ("transition" as Track), step: w?.step ?? 1 });

// A turn finishes the current step only if it's the kind of turn that step asks for.
export const nextStep = (track: Track, step: number, done: Done | null) =>
  PATHS[track][step - 1]?.done === done ? step + 1 : step;

// The one next step every reply ends with.
export function suggest(track: Track, step: number, advanced: boolean) {
  const steps = PATHS[track];
  const ask = steps[step - 1]?.ask ?? FINISHED;
  if (!advanced) return ask;
  return step > steps.length
    ? `That's all ${steps.length} steps done! ${ask}`
    : `That's step ${step - 1} of ${steps.length} done. ${ask}`;
}

// The employer's view: team totals only, and groups of 1-2 people hidden like the map's categories.
export function readiness(workers: Progress[]) {
  const finished = (w: Progress) => pathOf(w).step > PATHS[pathOf(w).track].length;
  const count = (keep: (w: Progress) => boolean) => {
    const n = workers.filter(keep).length;
    return n > 0 && n < MIN_GROUP ? null : n;
  };
  return {
    onTransition: count((w) => pathOf(w).track === "transition" && !finished(w)),
    onNewHire: count((w) => pathOf(w).track === "newhire" && !finished(w)),
    completed: count(finished),
  };
}
