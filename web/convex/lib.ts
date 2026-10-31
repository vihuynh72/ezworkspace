// Pure rules behind the Compact. No database access, so tests/lib.test.ts can check them directly.

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

// The value story: keep people and move them into AI-era work, instead of firing, re-hiring or retraining.
export const VALUE_SOURCES = [
  { label: "Cost to replace an employee: 0.5-2x salary (Gallup)", url: "https://www.gallup.com/workplace/247391/fixable-problem-costs-businesses-trillion.aspx" },
  { label: "AP clerk median pay $49,210 (BLS)", url: "https://www.bls.gov/ooh/office-and-administrative-support/bookkeeping-accounting-and-auditing-clerks.htm" },
  { label: "Bootcamp ~$14k, ~14 weeks (Course Report)", url: "https://www.coursereport.com/coding-bootcamp-ultimate-guide" },
];
const AP_SALARY = 49210;

export function value(logs: { minutesPerWeek: number }[], voices: number, hourlyCost: number) {
  const hoursPerWeek = round1(logs.reduce((s, l) => s + l.minutesPerWeek, 0) / 60);
  const teamHoursPerWeek = voices * 40;
  return {
    hoursPerWeek,
    teamHoursPerWeek,
    aiShare: teamHoursPerWeek ? Math.min(1, Math.round((hoursPerWeek / teamHoursPerWeek) * 1000) / 1000) : 0,
    quarterlyValue: Math.round(hoursPerWeek * hourlyCost * WEEKS_PER_QUARTER),
    replaceCostLow: AP_SALARY / 2,
    replaceCostHigh: AP_SALARY * 2,
    bootcampCost: 14000,
  };
}

const round1 = (n: number) => Math.round(n * 10) / 10;
