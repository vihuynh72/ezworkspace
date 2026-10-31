// Pure rules behind the Compact. No database access, so tests/lib.test.ts can check them directly.

export const DIVIDEND_PCT = 30;
export const FEE_PCT = 10; // charged on top of the dividend, never taken out of it
export const MIN_GROUP = 3; // categories with fewer people are hidden from the employer
const WEEKS_PER_QUARTER = 13;

type Log = {
  workerId: string;
  task: string;
  category: string;
  minutesPerWeek: number;
  keepHuman: boolean;
  originator: boolean;
};

export const sealed = (voices: number, quorum: number, signed: boolean) =>
  voices < quorum || !signed;

export function teamMap(logs: Log[]) {
  const cats = new Map<string, { minutes: number; people: Set<string>; keep: Set<string> }>();
  for (const l of logs) {
    const c = cats.get(l.category) ?? { minutes: 0, people: new Set(), keep: new Set() };
    c.minutes += l.minutesPerWeek;
    c.people.add(l.workerId);
    if (l.keepHuman) c.keep.add(l.workerId);
    cats.set(l.category, c);
  }
  const visible = [...cats].filter(([, c]) => c.people.size >= MIN_GROUP);
  const visibleNames = new Set(visible.map(([name]) => name));
  return {
    hoursPerWeek: round1(logs.reduce((s, l) => s + l.minutesPerWeek, 0) / 60),
    categories: visible
      .map(([category, c]) => ({
        category,
        hoursPerWeek: round1(c.minutes / 60),
        contributors: c.people.size,
        keepHuman: c.keep.size,
      }))
      .sort((a, b) => b.hoursPerWeek - a.hoursPerWeek),
    hiddenCategories: cats.size - visible.length,
    keepList: [
      ...new Set(logs.filter((l) => l.keepHuman && visibleNames.has(l.category)).map((l) => l.task)),
    ],
    originators: new Set(logs.filter((l) => l.originator).map((l) => l.workerId)).size,
  };
}

// Payout order is the ethics: workers first, then our fee, then the company.
export function payout(logs: Log[], hourlyCost: number, dividendPct: number, company: string) {
  const quarterlySavings = Math.round(
    (logs.reduce((s, l) => s + l.minutesPerWeek, 0) / 60) * hourlyCost * WEEKS_PER_QUARTER,
  );
  const pool = Math.round((quarterlySavings * dividendPct) / 100);
  const fee = Math.round((pool * FEE_PCT) / 100);
  // Originators of a shortcut earn a 1.5x weight on the time it saves.
  const weights = new Map<string, number>();
  for (const l of logs) {
    weights.set(l.workerId, (weights.get(l.workerId) ?? 0) + l.minutesPerWeek * (l.originator ? 1.5 : 1));
  }
  const totalWeight = [...weights.values()].reduce((s, w) => s + w, 0);
  const perWorker = new Map(
    [...weights].map(([id, w]) => [id, totalWeight ? Math.round((pool * w) / totalWeight) : 0]),
  );
  return {
    quarterlySavings,
    dividendPct,
    feePct: FEE_PCT,
    perWorker,
    steps: [
      { order: 1, kind: "workers" as const, label: `Workers who surfaced the savings (${dividendPct}%)`, amount: pool },
      { order: 2, kind: "fee" as const, label: `ezworkspace fee (${FEE_PCT}% on top of the dividend)`, amount: fee },
      { order: 3, kind: "company" as const, label: `${company} keeps the rest`, amount: quarterlySavings - pool - fee },
    ],
  };
}

const round1 = (n: number) => Math.round(n * 10) / 10;
