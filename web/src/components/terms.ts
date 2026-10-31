// The four Compact terms: promised on the signed-out page, signed on the dashboard.
export const compactTerms = (months = 12): [string, string][] => [
  ["No Worker Worse Off", `No pay cuts or AI layoffs for ${months} months. Role changes come with a funded transition plan.`],
  ["Paid learning time", "Workers practice with their coach on company time."],
  ["Shadow-AI amnesty", "Sharing how you use AI can never be used against you. Originators get credit."],
  ["Private by design", "The company sees team totals only. Groups under 3 are hidden. Raw messages are never stored."],
];
