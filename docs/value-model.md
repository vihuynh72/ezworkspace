# ezworkspace value model

> Falling behind on AI is no longer a reason to let someone go. ezworkspace makes catching up part of the job.

## What the research says

- **Replacing people:** 0.5 to 2× annual salary, "a conservative estimate" ([Gallup, 2019](https://www.gallup.com/workplace/247391/fixable-problem-costs-businesses-trillion.aspx)); 33% at the conservative end ([Work Institute](https://workinstitute.com/blog/tag/cost-of-turnover/)); $4,129 per hire for recruiting alone ([SHRM, 2016](https://shrm.org/topics-tools/news/shrm-benchmarking-report-4129-average-cost-per-hire)).
- **Formal reskilling:** a coding bootcamp averages ~$14,000 and ~14 weeks ([Course Report](https://www.coursereport.com/coding-bootcamp-ultimate-guide)); public four-year in-state tuition averages $11,950 a year ([College Board, 2025-26](https://research.collegeboard.org/trends/college-pricing/highlights)). On the job, AI spreads top workers' practices and helps newer workers "move down the experience curve" ([NBER w31161](https://www.nber.org/papers/w31161)).
- **Exposure:** ~80% of US workers could have 10%+ of their tasks affected by LLMs, 19% half or more. LLMs alone could speed up ~15% of all tasks at equal quality; LLM-powered software, 47–56% ([Eloundou et al.](https://arxiv.org/abs/2303.10130)). 36% of occupations use AI on a quarter or more of their tasks, 57% of it augmenting rather than automating ([Anthropic Economic Index, Feb 2025](https://www.anthropic.com/news/the-anthropic-economic-index)).
- **Novices gain most:** across 5,179 support agents, AI raised issues resolved per hour 14% on average and 34% for novice and low-skilled workers, minimal for experienced ones ([NBER w31161](https://www.nber.org/papers/w31161)). Hence the NEW path, and originator credit for veterans.

## The model, out loud

"Share = hours the map says AI can take ÷ team hours. Hours back = those hours, every week. Value = those hours × loaded hourly cost × 13 weeks. The team keeps that time and moves it into new work. Against that: replacing N people costs N × 0.5 to 2 × salary, and courses cost N × (tuition + hours away × loaded cost) with the workflow unchanged."

## Worked example: Acme Insurance AP, 5 people (demo data, `web/convex/seed.ts`)

1. **Map:** 19 hrs/week from 4 seeded voices, 21 once the judge texts "2 hours a week" (self-reported; pilots check it against measured cycle time).
2. **Share:** 21 ÷ 200 = 10.5% of team time (*assumption: 40-hour weeks*). Conservative next to Eloundou's 47–56%.
3. **Value:** 21 × $48 × 13 = **$13,104 a quarter** (*assumption: $48/hr loaded cost*). BLS median for bookkeeping, accounting and auditing clerks, our AP proxy: $23.66/hr, $49,210/yr ([BLS, May 2024](https://www.bls.gov/ooh/office-and-administrative-support/bookkeeping-accounting-and-auditing-clerks.htm)).
4. **Value card:** what the COO sees once the map opens: 10.5% of team time, **21 hrs/week back**, **$13,104 a quarter**, next to the two costs below.
5. **Replace one clerk:** $49,210 × 0.5–2.0 = **$24,605–$98,420** (Gallup's range on the BLS median).
6. **Bootcamp:** ~**$14,000** and ~14 weeks per person; ~$70,000 for all five, plus missed hours, and the workflow is unchanged. A degree: $47,800 tuition each (*assumption: 4 years*).
7. **Sensitivity:** at 1.4× the BLS wage ($33/hr, *assumption* for benefits and taxes), the same hours are worth ~$9.0k a quarter.

21 hours is about half of one job. Under the Compact it goes back into the team, not out the door.

## Numbers we can say on stage

1. "Replacing one person costs half to twice their salary. For one AP clerk, that's $24.6k to $98.4k." [Gallup](https://www.gallup.com/workplace/247391/fixable-problem-costs-businesses-trillion.aspx), [BLS](https://www.bls.gov/ooh/office-and-administrative-support/bookkeeping-accounting-and-auditing-clerks.htm)
2. "80% of US workers could have at least a tenth of their tasks affected by LLMs." [Eloundou et al.](https://arxiv.org/abs/2303.10130)
3. "36% of occupations use AI on at least a quarter of their tasks." [Anthropic](https://www.anthropic.com/news/the-anthropic-economic-index)
4. "AI made novice support agents 34% more productive." [NBER](https://www.nber.org/papers/w31161)
5. "A bootcamp averages $14k and 14 weeks." [Course Report](https://www.coursereport.com/coding-bootcamp-ultimate-guide)
6. "BLS projects bookkeeping and accounting clerk jobs to shrink 6% by 2034." [BLS](https://www.bls.gov/ooh/office-and-administrative-support/bookkeeping-accounting-and-auditing-clerks.htm)
7. "Our demo team: 21 hours a week back, about $13.1k of time a quarter."

## Dashboard constants

```ts
export const VALUE_SOURCES = [
  { label: "Cost to replace an employee", value: "0.5–2× annual salary", url: "https://www.gallup.com/workplace/247391/fixable-problem-costs-businesses-trillion.aspx" },
  { label: "Turnover cost, conservative", value: "33% of salary", url: "https://workinstitute.com/blog/tag/cost-of-turnover/" },
  { label: "Average coding bootcamp", value: "~$14,000, ~14 weeks", url: "https://www.coursereport.com/coding-bootcamp-ultimate-guide" },
  { label: "Public 4-year in-state tuition, 2025-26", value: "$11,950/yr", url: "https://research.collegeboard.org/trends/college-pricing/highlights" },
  { label: "US workers with 10%+ of tasks exposed to LLMs", value: "80%", url: "https://arxiv.org/abs/2303.10130" },
  { label: "Tasks faster with LLM-powered software", value: "47–56%", url: "https://arxiv.org/abs/2303.10130" },
  { label: "Occupations using AI on 25%+ of tasks (Feb 2025)", value: "36%", url: "https://www.anthropic.com/news/the-anthropic-economic-index" },
  { label: "AI productivity gain, novices / average", value: "+34% / +14%", url: "https://www.nber.org/papers/w31161" },
  { label: "Clerk median wage, May 2024 (AP proxy)", value: "$23.66/hr", url: "https://www.bls.gov/ooh/office-and-administrative-support/bookkeeping-accounting-and-auditing-clerks.htm" },
];
```
