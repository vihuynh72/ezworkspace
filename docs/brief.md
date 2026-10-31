# ezworkspace: decision brief

## Do these now, while the build plan settles (about 45 min, highest risk first)
1. **Photon:** give Terminal or your IDE Full Disk Access (System Settings > Privacy). Confirm Messages.app is signed in. Then run the script below, text yourself from another iPhone, and **time the round-trip**, because the polling interval is not documented.
   `bun add @photon-ai/imessage-kit better-sqlite3` and run a 10-line `startWatching({onMessage})` script that echoes back with `sdk.send`.
2. **Nebula:** open the event page and find the sponsor link. If you can't find an API in 10 minutes, drop it.
3. **Clerk:** create the app and turn on Organizations. Add a JWT template named exactly `convex` with an `org_id` claim, and copy the issuer domain.
4. **Firecrawl:** create a key, claim the event credits, and run one `curl` scrape of a state WARN page. Save the JSON as a fixture.
5. **Phones:** line up 2 friends with iPhones to play the 5th worker and Maria, and save their numbers.
6. **Rubric:** ask an organizer how "business model" and "ethics" are weighted, and whether Photon's prize doubling applies here.

## The pick
**ezworkspace.** Workers privately text an agent about how they really work, including the AI they use quietly. Their team's redesign map stays sealed until two things are true: at least 5 workers have joined, and the employer has signed a Compact guaranteeing that no affected worker ends up worse off. Our fee is invoiced only after workers have received their dividend.

**Why it wins.** The ethics are built into the data path, not written on a slide.
- No query returns per-person rows.
- The map does not exist for the employer until the quorum and the Compact are both in place.
- The money moves in a fixed order: the worker is paid, then us, then the company.

It turns Harold's minimal requirement into a contract term, and it gives each of the three hardships a direct fix. It also answers the brief's weak scores. It stands out because workers hold the key. It is hard to copy because an employer-first vendor cannot credibly keep data sealed from its own customer.

**Grafts (and where they come from):**
- Waterfall: the payout order and our fee subordinated to the worker dividend; the per-worker Pareto gate plus two-key cosign; originator credit for disclosed shadow AI.
- Charter: a COO-bought pilot as the main way in, which fixes the cold start; 20% of the pilot fee held in escrow against a day-90 trust pulse; elected worker reps.
- Pareto Bond: a 3-question iMessage pulse covering income, well-being and fairness; WARN-crawl revocation, with a human confirming first.
- Workprint: the Retraining Reality Check as a remedy option (stretch goal).
- Residuals: the closing line "you can't automate someone out of a job for free."

**Runner-up: Waterfall.** Pick it instead if you would rather not depend on live iMessage input from judges. Its demo is driven by the COO's clicks plus one SIGN reply, which makes it safer.

## Problem & why now
- **Workers hide AI use.** 57% hide their AI use or present AI output as their own work, and 40% have a workplace AI policy. Survey of 48K people. ([HRGrapevine](https://www.hrgrapevine.com/us/content/article/2025-05-02-covert-use-of-artificial-intelligence-at-work-poses-risk-study-finds), [MBS](https://www.mbs.edu/2025-impact-report/impact-stories/Global-study-reveals-trust-of-AI-remains-a-critical-challenge)) The best redesign data is hidden because showing hours saved invites cuts.
- **Workers are anxious.** 52% of US workers are worried about AI at work, and 32% expect fewer opportunities. ([Pew](https://www.pewresearch.org/social-trends/2025/02/25/u-s-workers-are-more-worried-than-hopeful-about-future-ai-use-in-the-workplace/))
- **There is a trust gap.** 61% of executives vs 9% of workers trust AI for critical decisions. This is a vendor-funded survey, so say so. ([CFOtech](https://cfotech.com.au/story/workers-bypass-ai-as-trust-gap-widens-walkme-warns))
- **The mid-market is under-served.** Reejig fits 10,000+ employees ([RFP.wiki](https://www.rfp.wiki/enterprise-software-enterprise-application-software-eas-enterprise-service-management-esm/talent-intelligence-platforms/reejig)). Workday's Work Intelligence (13 Oct 2026) is early access for its own HCM customers only ([Workday](https://newsroom.workday.com/2026-10-13-Workday-Introduces-Work-Intelligence-to-Help-Customers-Design-Work-for-AI)).
- **The rules are coming.** EU AI Act high-risk obligations for employment AI now apply from 2 Dec 2027 ([Gibson Dunn](https://www.gibsondunn.com/eu-ai-act-omnibus-agreement-postponed-high-risk-deadlines/)). Colorado's ADMT disclosure law takes effect 1 Jan 2027 ([Bloomberg Law](https://news.bloomberglaw.com/payroll/overhaul-of-colorado-ai-bias-law-headed-to-polis-for-signature)).

Do not cite layoff counts. None of them are sourced.

## Who pays, who benefits
- **Payer:** the COO or VP Ops of a 200–2,000-person knowledge-work firm who is under an AI mandate. They buy a department pilot and sign the Compact.
- **Primary user:** individual workers in ops, finance and support. It is free, private, iMessage-only, with no app.
- **Benefits:**
  - Workers get a dividend, a pay floor, a Keep List of tasks that stay human, credit for their shadow AI, and a veto through the quorum.
  - The COO gets honest task data, a supervised prototype that people actually keep using, and a public badge.
  - Worker reps get a co-sign gate.
- **Growth loop:** worker-first. A coworker invite plus the "3 of 5 voices" counter pulls in unsigned teams, and those teams create inbound demand for the COO.

## Ethical architecture
1. **Private by default, enforced by the server.** Each log is keyed to the worker's phone or user ID, never to the org. No Convex query returns a per-person row, even for admins. *Demo:* the COO clicks "view Maria's logs" and the API returns nothing.
2. **ezworkspace plus k-suppression.** `teamMap` returns `{sealed:true,count}` until there are at least 5 contributors and a signed Compact. Any category with fewer than 3 contributors is hidden. *Demo:* the counter goes from 4/5 to 5/5 live and the map is still locked.
3. **The Compact is Harold's minimal requirement as a contract.** It has four terms:
   - No affected worker's pay is cut for 12 months.
   - Any role cut needs a funded transition.
   - Shadow-AI amnesty: disclosures can never be used for discipline.
   - Dividend at X%.
   *Demo:* the COO reads the 4 terms and clicks Sign.
4. **The payout order.** Measured savings go first to the worker dividend (30%), then to our fee (10% charged on top, invoiced only once the worker tranche is marked paid), then to the company. *Demo:* the bars animate in that order and the worker's phone buzzes first.
5. **Two-key plus a Pareto gate per automation.** An automation ships only when three things are true: the affected worker replies SIGN, the manager approves, and every affected worker is at or above zero or has a remedy attached. The remedy can be pay protection or redeployment to a task on that worker's Keep List. *Demo:* "Blocked: Maria worse off." The COO attaches a Keep List redeploy, Maria texts SIGN, and the gate turns green.
6. **Originator credit, no bounty for reporting peers.** A worker who discloses their own AI trick is credited as its originator and gets a larger share. There is no data path for reporting a peer. *Demo:* a ledger line reads "originator: you, +$X".
7. **The registry has teeth, with due process.** Firecrawl flags WARN listings for signers. A human confirms, the company gets a 72-hour response window, then the badge is revoked publicly and the 20% pilot escrow is refunded. *Demo:* a cached WARN hit shows "PENDING REVIEW" on the registry. Stretch goal.

## Business cycle and revenue
**Flywheel:**
1. Workers join free through a coworker's text and get a private work coach. Their logs build up as a side effect.
2. A team reaches quorum, and the COO gets one message: "Sealed map: 41 hrs/week, 6 workflows. Terms attached." Alternatively the COO buys a pilot first and invites the team.
3. The COO signs the Compact, the map unseals, and one supervised prototype ships through two-key consent.
4. Dividends are paid first. Each worker gets a shareable iMessage receipt, and the employer is listed in the public registry.
5. Workers carry ezworkspace to their next job, and signed employers recruit with the badge. Unsigned teams near quorum put pressure on their employers.
6. More Compacts make the registry more credible. Firecrawl revocations prove the badge can be lost, which makes it worth more.

**Prices.** These are hypotheses. Say "to validate" on stage.
- **Workers:** $0, forever.
- **Department pilot:** $12k for 4 weeks. $2.4k of it (20%) is held in escrow and released only if the anonymous day-90 trust pulse is at or above baseline. That is well below the $50–100K proof-of-concept benchmark ([coworker.ai](https://coworker.ai/blog/how-much-should-enterprise-ai-cost-per-user)).
- **Platform fee:** $6 per covered employee per month, inside the $5–15 range for HR AI ([Workativ](https://workativ.com/hr/blog/hr-chatbot-pricing)).
- **Gainshare fee:** 10% charged on top of dividends actually paid, never deducted from them. We earn more only when workers are paid more.

**Unit sketch:** a 100-person department brings in $12k for the pilot plus $7.2k a year in platform fees, plus the gainshare fee. No sourced savings number backs this, so present it as a model, not a forecast.

## Why it builds a following
- **Workers are the distribution channel.** Every quorum counter ("3 of 5 voices") gives workers a reason to recruit a teammate.
- **Receipts get shared.** Every dividend receipt is a card workers can screenshot ("my shadow AI earned me $312").
- **The registry is public.** Job seekers can search "Did this employer sign?", and every revocation is news.
- **A monthly anonymized "Shadow AI Report"** (built only from data past quorum) gives press reach.
- **Positioning:** a worker-side movement that employers join, not an HR tool imposed on workers.

## Sponsor map
| Sponsor | Exact use | API | Fake if broken |
|---|---|---|---|
| Photon (local kit) | Worker intake, coaching reply, SIGN/BLOCK cosign, dividend receipts | `startWatching({onMessage})` relays into `ConvexHttpClient.mutation(api.ingest.text, {secret, from, body})`. A relay loop polls `api.outbox.pending` every 2s and calls `sdk.send(to, body)`. **The local kit has no webhooks or reactions.** Use plain-text replies; don't plan on reactions. | A web "simulate text" form posting to the same mutation, plus a pre-recorded 15s phone clip |
| Convex | Sealing query, Pareto gate, payout ledger, live counters, outbox | `query`/`mutation`, an `action` for the LLM and Firecrawl (fetch only works in actions), `useQuery` | none. This is the core |
| Clerk | COO and rep orgs and roles; gates the dashboard and the Sign button | `<OrganizationSwitcher/>`, a `convex` JWT template with an `org_id` claim, `ConvexProviderWithClerk`, a role check in mutations | Hard-code `role:"admin"` |
| Firecrawl | WARN and press check for signers, which moves the registry to PENDING REVIEW | `new Firecrawl({apiKey}).scrape(url,{formats:["markdown"]})` inside a Convex action. The v2 method names are from memory. | A cached JSON fixture |
| Nebula | **Dropped.** Identity unresolved | none | none |

Photon's hosted Spectrum (reactions, webhooks) is worth using only if the event hands out keys. Its webhook path into Convex is untested.

## Data model (Convex)
- `workers`: phoneHash, teamId, emailDomainVerified, joinedAt
- `logs`: workerId, task, category, tool, minutesSaved, keep:boolean, originator:boolean
- `teams`: orgId, name, quorum (5), compactId?
- `compacts`: teamId, signedBy, signedAt, dividendPct (30), floorMonths (12), amnesty:true, escrowStatus
- `automations`: teamId, task, affectedWorkerIds, cosigns{workerId:SIGN|BLOCK}, managerApproved, remedy?, status
- `ledger`: teamId, kind (worker_dividend|fee|company), workerId?, amount, paidAt?
- `outbox`: to, body, sentAt?
- `registry`: orgName, status (signed|pending_review|revoked), evidenceUrl, respondBy

## 3-hour solo build plan
- **0:00–0:30:** Run `npm create convex@latest` with the Next.js + Clerk template (the flag is unverified, so pick it from the menu). Write the schema. Wire the Clerk org and the `org_id` claim. Seed 4 workers and their logs.
- **0:30–1:00:** Write the Photon relay script (`relay.ts`): watch, call the ingest mutation, poll the outbox, send. Protect the mutation with a shared `secret` arg. Prove the text-to-self round trip.
- **1:00–1:30:** The ingest action. Use an LLM to parse each text into `{task, category, minutesSaved, keep}`, with a regex fallback. Reply "Saved privately. Only you see this. Team: 4/5 voices."
- **1:30–2:00:** The `teamMap` query: sealing, k≥3 category suppression, never per-person rows. Add an assert self-check with 3 cases: 4 voices stays sealed; 5 voices without a Compact stays sealed; 5 voices with a Compact unseals and hides categories under 3. Build the COO dashboard: the blurred SEALED card and live counter.
- **2:00–2:30:** The `signCompact` mutation and the payout computation. The fee row is inserted only after the worker rows are marked paid; add an assert for this. Queue a receipt in the outbox for each contributor. Animate the bars.
- **2:30–3:00:** The automation card with the Pareto gate: red, attach remedy, SIGN reply, green. The registry page reads the cached Firecrawl fixture. Rehearse twice on real phones.

**Cut list, in this order:** live Firecrawl (use the fixture), then the registry page, then the automation/Pareto card (narrate it with a static mock), then the LLM parse (regex only), then Clerk (hard-code the role). **Never cut** the sealing query, the payout order or the iMessage receipt.

**If iMessage fails:**
- Switch to the web simulate form. It hits the same mutation, so the dashboard still flips live.
- Play the pre-recorded phone clip for the buzz.
- Say so honestly on stage.

## 3-minute pitch + 60-second demo
**Opener (word for word):**
"More than half of workers hide how they use AI at work. They aren't lazy. They're scared: showing the hours you saved is how you get your job cut. So every COO with an AI mandate is redesigning work blind. ezworkspace flips who holds the key."

**0:20–1:20 (the model):**
- Workers text us free over iMessage and the data stays theirs.
- A team's redesign map stays sealed until 5 voices join and the company signs the ezworkspace Compact. The Compact has four terms:
  - No affected worker loses pay for 12 months.
  - No role is cut without a funded transition.
  - Amnesty for shadow AI.
  - 30% of measured savings goes to the team.
- Our fee comes after workers are paid, never out of their share. We only earn more when they do.
- That is Harold's minimal requirement written as a contract: nobody is worse off than without the AI. And it is graded, not a ban.

**1:20–2:20 (demo, 60s):**
- "This team is at 4 of 5." Hand a judge the phone: "Text what you really do with AI."
- The counter flips to 5/5 and the map stays locked: "Workers hold the key, but the company still has to sign."
- Click Sign. The map unseals: 41 hrs/week, with the Keep List showing client calls. The judge's phone buzzes: "Your company signed. Projected dividend: $X/quarter."
- Ship the automation: it goes red, "Maria worse off." Attach a redeploy from her Keep List. Maria texts SIGN and it turns green.
- "We don't get paid until she does."

**2:20–3:00 (the business):**
- A $12k pilot with 20% escrowed against day-90 trust, then $6 per employee per month, then 10% charged on top of dividends.
- Workers spread it, receipts get shared, and a public registry that Firecrawl keeps honest makes the badge mean something.
- "Reejig sells to the employer. We're the only one an employer can't copy, because we answer to workers."

## Red team
1. **The COO coerces a worker to show their phone or logs.** No API path returns per-person data. Coercion breaches the Compact and costs the employer its badge publicly. Workers can text "forget me" for full deletion.
2. **The employer plants fake workers to force quorum.** One voice per phone, with an email-domain check. ezworkspace only unseals data; it never ships an automation. Two-key consent is still required.
3. **Workers inflate the minutes they say they save.** Dividends come from measured team cycle time. Self-reports only shape the map.
4. **The employer signs, then lays people off.** The Firecrawl WARN check flags it, a human confirms, the company gets 72 hours to respond, the badge is revoked and the escrow refunded. The funded-transition clause can be enforced as a contract term.
5. **Confidential customer data ends up in texts.** The agent replies "don't paste client details" and stores only task category and minutes. Raw text is kept only on the worker's request.

## Open risks
- **Photon latency and reach.** The polling interval is unknown. Judges with Android phones may not reach an iMessage-only Apple ID. Bring your own iPhones.
- **Legal.** Workers describing work to a third party may touch confidentiality agreements. The Compact turns this into an employer-sanctioned channel, but that only works after signing.
- **The "hostage" reading.** Lead with the COO-bought pilot; the bottom-up path is the growth loop, not the only way in.
- **Unproven numbers.** All prices and the 30% dividend are unvalidated, and the automation dividend model has no evidence base (per the research).
- **Unknowns.** Nebula and "Rorie" are unidentified. Firecrawl v2 method names and the Convex template flag are from memory.

Not checked: Photon's polling interval, Spectrum availability, and the event rubric. The biggest risk is the live iMessage round trip, so test it in the first 15 minutes.
