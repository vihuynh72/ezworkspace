# Product

<!-- impeccable:product-schema 1 -->

> Written by a subagent from the founder's build brief and `docs/` (pitch, brief, nebula notes) with no live interview. Every fact below is inferred from those sources; items marked *(inferred)* go beyond their literal wording. Confirm with the founder after the demo.

## Platform

web

## Users

- **Workers (primary).** Back-office employees with zero AI background whose jobs automation threatens. Canonical persona: Maria, an accounts-payable specialist, eight years in. They text ezworkspace over iMessage or use the web chat on a phone. Their question is "will this be used to cut my job?"
- **COO / VP Ops (payer).** Runs a 200–2,000-person firm under an AI mandate. Uses the dashboard to watch the team join, sign the Compact, and read the unsealed redesign map and value.
- **Demo audience.** VCs and founders judging a 3-minute table demo; one judge texts in from the founder's iPhone as the 5th worker.

## Product Purpose

ezworkspace is the private AI transition coach for every worker, plus a Compact for the company. It learns how people really work (including hidden AI use), answers questions in plain language, sends each worker a private Transition Plan (text PLAN; also as a voice note), and teaches by doing (text TRY: practice one real task with AI in the chat; nothing is sent anywhere). The team's redesign map stays sealed until 5 workers join and the COO signs the Compact. Success: workers share what they really do, and nobody ends up worse off.

## Positioning

Workers hold one key. The employer sees nothing until quorum is reached and the Compact is signed, and even then only team totals. No query returns a per-person row, there is no endpoint for "who said what", and the money moves in a fixed order: workers are paid first, ezworkspace's fee comes on top, the company keeps the rest ("We don't get paid until they do"). Employer-first vendors (Reejig, Workday) cannot credibly seal data from their own customer.

## Operating Context

- Demo: Accounts Payable at Acme Insurance, 4 seeded workers, quorum 5. Reset before each judge.
- The dashboard runs on a laptop (1440x900 target, 1280x800 acceptable) next to an iPhone on the iMessage thread. The voices counter updating live is the key moment.
- The worker web chat (`#/text`) is the fallback for people without iMessage, used mobile-first.
- Nebula hosts the supervised prototype (#ap-redesign channel; the worker approves every agent draft). Firecrawl checks public WARN/layoff news for Compact signers; hits go to human review.

## Capabilities and Constraints

- Stack: Vite + React + Tailwind + shadcn/ui, Clerk (COO sign-in), Convex (live queries). iMessage via Photon Spectrum.
- The Compact, verbatim terms: (1) No Worker Worse Off: no pay cuts or AI layoffs for 12 months; any role change comes with a funded transition plan. (2) Paid learning time: workers practice with their coach on company time. (3) Shadow-AI amnesty and originator credit. (4) Team totals only; groups under 3 are hidden.
- Worker commands: PLAN, TRY, DELETE; any question gets a plain-language answer. Voice notes via text-to-speech.
- Pricing figures in docs are hypotheses; do not show them in the UI.

## Brand Commitments

- Name: "ezworkspace", always lowercase.
- Founder direction (binding): enterprise-grade and feasible; simple, usable, modern, calm, not overwhelming; trustworthy; must make people with zero AI background comfortable.
- Lines in use: "Private. Only you see this." · "We don't get paid until they do." · "Will this be used to cut my job? No."

## Evidence on Hand

- Live seeded demo data from Convex (`convex/seed.ts`): dollar figures come from the screen, never hard-coded.
- No logos, photography, testimonials, customer names, or press exist. Do not invent any. Worker quotes in `docs/pitch.md` are placeholders until collected.

## Product Principles

1. Privacy is enforced by the data path, not by a promise on a slide. The UI shows what the server refuses to return.
2. Workers first, in order and in money. Every surface puts the worker's outcome before the company's.
3. Plain language over AI vocabulary. A first-time user should never need to know what a model, prompt, or token is. *(inferred)*
4. Calm over clever: one clear next step per screen. *(inferred from founder direction)*

## Accessibility & Inclusion

Labels on every input and button, visible focus, reduced motion respected, color never the only signal. Workers may be older, on small phones, or anxious; text stays large and readable at 375px. *(inferred)*
