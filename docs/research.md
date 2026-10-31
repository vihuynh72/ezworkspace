# Research (Oct 30, 2026)

## sponsors

**Photon (iMessage for agents)**
- **What it is:** SDKs that let an AI agent send and receive iMessage. There are three tiers:
  - `@photon-ai/imessage-kit`: open source, local Mac only ([docs](https://photon.codes/docs/opensource/imessage-kit)).
  - `@photon-ai/advanced-imessage`: low-level client that talks to a server ([docs](https://photon.codes/docs/advanced-kits/imessage/getting-started.md)).
  - **Spectrum** (`spectrum-ts`): hosted, one API for iMessage, WhatsApp, Telegram and voice ([docs](https://photon.codes/docs)).
- **Calls:**
  - Local kit: `npm i @photon-ai/imessage-kit better-sqlite3` (or `bun add`).
  - Send: `await sdk.send("+1555…", "hi")`. Group: `sdk.listChats({type:"group"})`, then `sdk.send(chatId, …)`.
  - Receive: `sdk.startWatching({ onMessage, onGroupMessage, onError })`.
  - Spectrum: `Spectrum({projectId, projectSecret, providers:[imessage.config()]})`, then `for await (const [space] of app.messages) await space.send(...)`.
- **Gotchas:**
  - The local kit needs macOS, a Mac signed into Messages, Node 20+ or Bun, and Full Disk Access for your terminal or IDE.
  - It polls the Messages SQLite database. The interval is not documented.
  - The local kit cannot send reactions; it only has `.ifNotReaction()` to skip incoming ones. For reactions, threaded replies, edits and unsends, use Spectrum or the advanced kit.
  - Spectrum also supports webhooks (Hono, Express, Elysia adapters), which could post into a Convex HTTP action. I did not test this.
  - Spectrum needs a `PROJECT_ID` and `PROJECT_SECRET`. Pricing, free tier and hackathon credits are **not documented**; the docs list ryan@photon.codes for support.
- **Fastest demo:** the local kit on your own Mac. Watch messages, call the LLM, reply. Have a Node script relay into Convex with `ConvexHttpClient.mutation`. Photon says it doubles the prize if you win with its SDK ([update](https://photon.codes/weekly-update/april-17-2026)). Not verified for this event.

**Nebula: unresolved, needs the event page**
I found no listing that names Nebula alongside these sponsors ([search](https://convex.dev/hackathons/all-gas)). Two candidates:
1. **Nebula (nebula.gg, Agent Labs):** an autonomous agent platform with 2,500+ app connectors (Gmail, Slack, GitHub) that run in sandboxes ([dev.to](https://dev.to/nebulagg), [App Store](https://apps.apple.com/us/app/-/id6757687588)). It fits an agent hackathon best, but I found no public developer API.
2. **thirdweb Nebula:** a blockchain AI that was renamed "thirdweb AI", and its site was shut down in Sep 2025 ([changelog](https://portal.thirdweb.com/changelog/thirdweb-ai-now-available-in-dashboard)). Unlikely.

**Clerk** (from memory, not fetched this run)
- **What it is:** sign-in and user accounts, plus Organizations with roles and permissions. A user's personal account exists without belonging to any org.
- **Calls:**
  - `npm i @clerk/nextjs`, wrap the app in `<ClerkProvider>`, add `clerkMiddleware()`.
  - `<OrganizationSwitcher hidePersonal={false}/>`.
  - `auth().has({ permission: "org:x:y" })`.
- **Convex link:** create a JWT template named exactly `convex` in the Clerk dashboard. Set `CLERK_JWT_ISSUER_DOMAIN` in `convex/auth.config.ts`. Use `ConvexProviderWithClerk`.
- **Gotcha:** the org ID is not in the Convex identity unless you add an `org_id` claim to the JWT template.
- **Extras:** Clerk Billing and M2M tokens exist. I did not check whether they are generally available, so skip them under 3 hours.

**Convex** (from memory)
- **What it is:** a realtime backend.
- **Calls:**
  - `npm create convex@latest` and pick the Next.js + Clerk template (`-t nextjs-clerk`, unverified), then `npx convex dev`.
  - `query` / `mutation` / `action` with `useQuery`, which updates live.
  - `ctx.scheduler.runAfter(0, internal.x.y, args)` and `cronJobs()`.
  - `httpRouter()` + `httpAction` to receive webhooks at `https://<deployment>.convex.site`.
- **Agent tools:** the `@convex-dev/agent` and `@convex-dev/workflow` components, registered in `convex.config.ts`.
- **Gotcha:** `fetch` to outside APIs (LLM, Firecrawl) only works inside actions, not queries or mutations.

**"fireclaw" = Firecrawl**
I found no product literally named FireClaw. The search only returned OpenClaw, the open-source agent ([e.g.](https://www.coderhouse.com/en/articles/openclaw-ai-agents-2026)). Treat it as a typo for Firecrawl.
- **What it is:** turns a URL, a crawl or a web search into markdown an LLM can read.
- **Calls:** `npm i @mendable/firecrawl-js`, then `new Firecrawl({apiKey})` with `.scrape(url, {formats:["markdown"]})`, `.search(q)`, `.crawl(url, {limit})` (v2 SDK shape, from memory).
- **Gotcha:** crawls are slow, so call it from a Convex action and save results with a mutation. Earlier Convex events gave 20k credits each ([source](https://convex.dev/hackathons/all-gas)).

**De-risk first (highest risk first): tasks you can do now**
1. **Photon:** give your terminal or IDE Full Disk Access and confirm Messages is signed in. Run the smallest `startWatching` / `send` script to yourself and to a group. Check whether the event provides Spectrum keys; if it does, test reactions there.
2. **Nebula:** find the sponsor link on the hackathon page and get its API or docs. Decide whether to drop it.
3. **Clerk + Convex:** create the Clerk app and turn on Organizations. Add the `convex` JWT template with an `org_id` claim. Set `CLERK_JWT_ISSUER_DOMAIN` in Convex.
4. **Firecrawl:** create an API key, claim the event credits, and run one `curl` scrape.
5. **Convex HTTP:** deploy one `httpAction` and hit it with `curl` to prove the webhook route works.

I did not verify Photon pricing, the watcher polling interval, Clerk Billing or M2M status, the exact Convex template flag, or Firecrawl v2 method names. Those Clerk, Convex and Firecrawl details are from memory.

## market

## Market scan: AI work redesign for 200–2,000-person knowledge-work companies (Oct 2026)

**1. Reejig**
- **What it sells:** It calls itself a "Work Operating System" for redesigning work across people and AI agents. The core is a Work Ontology plus a Work Context Graph that maps jobs, tasks and workflows ([YesPress](https://yespress.io/reejig.md)). It says it can run autonomous agents within set limits ([GetApp](https://www.getapp.com/all-software/a/reejig/)) and tracks hours freed up, value created and AI adoption ([RFP.wiki](https://www.rfp.wiki/enterprise-software-enterprise-application-software-eas-enterprise-service-management-esm/talent-intelligence-platforms/reejig)).
- **Recent launches:** Work Architecture platform in June 2025 ([Bersin](https://joshbersin.com/2025/06/reejig-launches-work-architecture-platform-to-speed-transition-to-ai/)). Work Architect Academy (a "Work Blueprint" framework plus certifications) and new advisors in 2026 ([SHRM](https://vendordirectory.shrm.org/company/915050/news/3823894/reejig-launches-work-architect-academy-and-appoints-michael-fraccaro-and-jessica-neal-as-advisors)).
- **Customers:** Reportedly Salesforce, Microsoft, J&J and Mastercard. One review site says it fits best at **10,000+ employees** ([RFP.wiki](https://www.rfp.wiki/enterprise-software-enterprise-application-software-eas-enterprise-service-management-esm/talent-intelligence-platforms/reejig)). That leaves the 200–2,000 band under-served.
- **Pricing:** Not published anywhere I found. Assume it is quote-only.

**2. "Rorie"**
- **I could not identify it.** No product, startup or funding record matched. The closest results were Orgvue's Henshaw AI, INOP and Teamohana, and none of them is clearly "Rorie" ([IT Brief](https://itbrief.com.au/story/orgvue-unveils-henshaw-ai-to-transform-workforce-planning)). The name in the brief may be misspelled or the company may still be in stealth. Ask whoever wrote the brief for a link.

**3. Adjacent players**
- **Workday:** Runs the Agent System of Record (Feb 2025), a single place to manage all agents ([TechCrunch](https://techcrunch.com/2025/02/11/workday-launches-a-platform-for-enterprises-to-manage-all-of-their-ai-agents-in-one-place)). Added Work Intelligence on Oct 13 2026 to "design work for AI", in early access for its HCM customers ([Workday](https://newsroom.workday.com/2026-10-13-Workday-Introduces-Work-Intelligence-to-Help-Customers-Design-Work-for-AI)). Pricing has moved toward usage-based Flex Credits ([LDS](https://letsdatascience.com/news/workday-pursues-usage-based-ai-agent-pricing-3990f2aa)). **This is the biggest threat to the category.**
- **Eightfold AI:** Skills and talent intelligence. Estimated **$7–10 per employee per month (PEPM)**, plus $5K–50K to implement over 3–6 months, and no trial ([Pin](https://www.pin.com/blog/eightfold-pricing/)).
- **Lightcast:** Labor-market and skills data. Priced through sales only ([G2](https://www.g2.com/products/lightcast/pricing)).
- **Orgvue:** Org design and workforce planning, with Henshaw AI. Quoted per deployment ([ERP Research](https://erpresearch.com/erp-add-ons/hcm-extensions/orgvue/pricing)).
- **Worklytics:** Passive analysis of collaboration and AI-adoption data, and the only one with published tiers ([Worklytics](https://www.worklytics.co/pricing)). That also raises the question of whether workers are being watched.
- Everest Group now calls this category "work intelligence platforms" ([Everest](https://www.everestgrp.com/blogs/work-intelligence-platforms-enabling-continuous-workforce-evolution-in-the-ai-era/)). I found nothing on Skan (task mining).

**4. Controversies showing the worker-trust gap**
- **Lattice, July 2024:** Announced it would give AI agents employee records, then reversed within about 3 days ([UsagePricing](https://www.usagepricing.com/blueprint/activity/lattice-2024-07-09-digital-workers-employee-records)). That source is secondary.
- **Klarna:** Its AI handled two-thirds of chats (2.3M) in the first month of 2024. The CEO later said quality suffered, and Klarna is rehiring people in an "Uber-type" model. How many it has rehired is disputed ([Entrepreneur](https://www.entrepreneur.com/business-news/klarna-ceo-reverses-course-by-hiring-more-humans-not-ai/491396), [Silicon Canals](https://siliconcanals.com/klarna-u-turns-on-ai-rehires-humans/)).
- **Not checked, from memory only:**
  - Duolingo's "AI-first" memo (Apr 2025) phased out contractors; there was backlash and it pulled social posts.
  - Shopify CEO Tobi Lütke's memo (Apr 2025) required teams to prove AI can't do a job before asking for headcount.
  - Challenger counted roughly 55K US job cuts attributed to AI in 2025.
  - Salesforce cut about 4K support roles, citing AI.
  - Amazon cut about 14K corporate roles in Oct 2025.

**5. Worker sentiment**
- **Hidden AI use:** **57%** of employees hide their AI use or present AI output as their own work; 66% don't check AI output; 47% have had training; 40% have a workplace AI policy. Survey of 48K people in 47 countries ([HRGrapevine](https://www.hrgrapevine.com/us/content/article/2025-05-02-covert-use-of-artificial-intelligence-at-work-poses-risk-study-finds), [MBS](https://www.mbs.edu/2025-impact-report/impact-stories/Global-study-reveals-trust-of-AI-remains-a-critical-challenge)).
- **Worker anxiety (Pew):** **52%** of US workers are worried about AI at work, 36% hopeful, 33% overwhelmed, and 32% expect fewer job opportunities. About 5,300 workers surveyed ([Pew](https://www.pewresearch.org/social-trends/2025/02/25/u-s-workers-are-more-worried-than-hopeful-about-future-ai-use-in-the-workplace/)).
- **Executive vs worker gap (WalkMe 2026):** **61%** of executives vs **9%** of workers trust AI for critical decisions. **88%** of executives vs **21%** of workers say employees have adequate tools. 3,750 respondents; vendor-funded survey ([CFOtech](https://cfotech.com.au/story/workers-bypass-ai-as-trust-gap-widens-walkme-warns)).
- **Workday (late 2023):** 62% of leaders vs 52% of employees welcome AI ([ITWeb](https://itweb.africa/content/nWJadMbNBYRMbjO1)).

**6. Pricing benchmarks**
- **HR AI:** $5–15 PEPM at about 500 employees. Leena AI $2–5 (1,000-seat minimum), Moveworks $8–15 ([Workativ](https://workativ.com/hr/blog/hr-chatbot-pricing), [Monetizely](https://www.getmonetizely.com/articles/why-are-per-employee-pricing-models-so-popular-for-hr-ai-solutions)).
- **Lattice:** Raised Foundations from $11 to $13 per seat and gave its AI agent away free ([UsagePricing](https://www.usagepricing.com/blueprint/activity/lattice-2025-10-02-ai-agent-included-no-cost)).
- **Proofs of concept:** One vendor guide puts them at **$50–100K over 6–12 weeks** ([coworker.ai](https://coworker.ai/blog/how-much-should-enterprise-ai-cost-per-user)). **A $25–50K 4-week pilot is not supported by any source I found.**
- **Overall AI spend:** Median about $11–12 per employee per month across all AI, per Ramp data ([BERI](https://www.beri.net/article/ai-spending-7500-per-employee-ramp-index-2026)).

## 5 white-space gaps
1. **A worker-side trust layer.** Every tool is sold to executives and HR. None gives employees a say before their tasks are redesigned: consent, appeal, or seeing the redesign of their own role. Hidden AI use (57%) is the visible symptom.
2. **Amnesty for hidden AI use.** No product turns secret AI use into credit and redesign input without employees risking their jobs.
3. **A product sized for 200–2,000 people.** Reejig fits 10K+, Eightfold takes 3–6 months to implement, and Workday is limited to its own HCM customers. A self-serve redesign in under 4 weeks for around $3–8 PEPM is open.
4. **Ethics and displacement accounting.** There is no audit trail showing which tasks went to agents, what happened to the people who did them (retrained, moved or let go), or the pay impact. That record will matter for regulation and reputation, as the Klarna, Duolingo and Lattice episodes show.
5. **Redesign that doesn't feel like surveillance.** Most task mining relies on passive monitoring. A self-reported or opt-in way to break down tasks, with people-analytics privacy limits, would ease the fear that 52% of workers report.

## Tasks you can do while this runs
- Track down "Rorie" from whoever wrote the idea brief.
- Book 3 calls with HR or ops leaders at 200–2,000-person companies to test gap #1 against gap #3.
- Ask Reejig and Eightfold sales for pilot terms to get real pilot pricing.

I used all 8 searches and opened no source pages directly, so every figure comes from search summaries. The Duolingo, Shopify and layoff numbers are from memory and need checking. The Lattice 2024 reversal rests on one secondary source.

## ethics

**(a) Regulation, Oct 2026**
- **EU AI Act (employment = Annex III high-risk):** Under the Digital Omnibus deal, the high-risk obligations for Annex III systems (HR and employment) move from 2 Aug 2026 to **2 Dec 2027**. Annex I moves to 2 Aug 2028. Political agreement came on 7 May 2026, and Official Journal publication is unconfirmed. ([Gibson Dunn](https://www.gibsondunn.com/eu-ai-act-omnibus-agreement-postponed-high-risk-deadlines/), [Sidley](https://datamatters.sidley.com/2026/06/22/eu-lawmakers-reach-provisional-agreement-to-delay-key-eu-ai-act-obligations/)) Article 26(7) requires deployers to tell workers' representatives and affected workers before putting a high-risk system into use. That article was not checked, and it now follows the delayed date.
- **Germany, BetrVG §87(1) no. 6:** The works council has codetermination rights over any technical system that is *objectively capable* of monitoring performance or behaviour, whether or not the employer means to use it that way. In practice no rollout happens without a works agreement. Not verified, from settled BAG case law.
- **NYC Local Law 144:** Automated employment decision tools for hiring or promotion need an independent bias audit every year with a public summary, plus 10 business days' notice to candidates. In force since July 2023. Not verified.
- **Colorado:** SB 24-205 was repealed and replaced by **SB 26-189** (signed 14 May 2026), a narrower ADMT transparency and disclosure law **effective 1 Jan 2027**. ([Bloomberg Law](https://news.bloomberglaw.com/payroll/overhaul-of-colorado-ai-bias-law-headed-to-polis-for-signature), [compliancehub](https://compliancehub.wiki/tag/sb-189/)) Litigation over the old law may still be open.
- **Illinois HB 3773:** Amends the Human Rights Act. From **1 Jan 2026** employers may not use AI that discriminates (including zip codes as a proxy) and must give notice when they use AI in employment decisions. Not verified this session.
- **California:** The CPPA's ADMT rules were approved by OAL on 23 Sep 2025, and the ADMT requirements apply from **1 Jan 2027**. Newsom **vetoed SB 7 "No Robo Bosses"** on 13 Oct 2025, pointing to the CPPA rules. ([Fisher Phillips](https://www.fisherphillips.com/en/news-insights/california-governor-vetoes-no-robo-bosses-act.html)) I found no successor bill.

**Union AI agreements**
- **WGA 2023:** AI cannot be credited as a writer, AI output does not count as source material, and studios cannot require writers to use AI. Recalled from memory, not checked.
- **SAG-AFTRA:** 2023 rules on consent and pay for digital replicas. A **2 May 2026** TV/theatrical deal added generative-AI safeguards and 3% yearly raises. Sources disagree on whether it has been ratified. ([The Week](https://www.theweek.in/news/entertainment/2026/05/06/actors-union-and-studios-seal-deal-amid-growing-ai-concerns.amp.html), [Jackson Lewis](https://jacksonlewis.com/insights/ai-stays-center-stage-entertainment-industry-collective-bargaining-talks))
- **AFL-CIO + Microsoft (Dec 2023):** Workers give input on AI design, the company commits to skills and transition support, and Microsoft stays neutral on organizing. A separate CWA deal requires Microsoft to give notice of AI that affects jobs and to bargain over the impact. ([GeekWire](https://www.geekwire.com/2023/microsoft-tries-to-address-ai-labor-concerns-with-new-afl-cio-pact-and-neutrality-framework/), [Hollywood Reporter](https://www.hollywoodreporter.com/business/business-news/microsoft-first-u-s-union-tentative-agreement-ai-1235739073))
- An analysis of **47 contracts with AI clauses (2023 to Mar 2026)** found the usual terms are notice, retraining and no-layoff clauses. This is a lower-quality source. ([metaintro](https://www.metaintro.com/blog/unions-ai-protections-2026-contracts))

**(b) Mechanisms and how money flows**
- **Gainsharing:** Productivity gains measured against a historical baseline are split with workers as a bonus pool. Scanlon measures labor cost against sales value, Rucker labor cost against value added, and Improshare hours saved. The evidence is old and mostly self-reported: Kaufman 1992 found productivity gains among 112 Improshare firms ([ILR Review](https://ideas.repec.org/a/sae/ilrrev/v45y1992i2p311-322.html), [Levy review](https://www.levyinstitute.org/wp-content/uploads/2024/02/wp125.pdf)). I found no recent meta-analysis.
- **Automation dividend:** A share of the hours or cost saved by automation is paid to the affected team, either as a bonus or as reinvested training time. There is no strong evidence for this specific model, so treat it as untested.
- **No-layoff or redeployment pledges:** Savings from automation pay for retraining and moves to new roles instead of severance. These terms appear in the union contracts above and in the Microsoft–CWA deal.
- **B Corp:** B Lab charges an annual fee based on revenue, about **$2,100** for companies under $5M and about $52.5k at $750M–$1B, plus verification fees above $15M. New standards apply from Jan 2026. ([B Lab US/CA](https://usca.bcorporation.net/new-b-corp-pricing))
- **Fair Trade:** Brands pay a licensing fee per labelled unit or on wholesale value (Fairtrade is cited at about 1.9% of wholesale). The fees fund audits and standards, and producers also receive a separate premium. Fair Trade USA gets most of its revenue from license fees. ([Haas case](https://cases.haas.berkeley.edu/2015/06/fairtrade), [Fairtrade](https://www.fairtrade.net/ca-en/for-business/your-path-to-certification/license-fees.html)) Current Fair Trade USA rates are not verified.
- **Driver's Seat (worker data co-op):** Free to drivers. It sells aggregate data to cities and transport agencies, and most profit and governance belong to driver-members. ([Platform Co-op](https://resources.platform.coop/resources/co-op-helps-uber-lyft-drivers-use-data-to-maximize-earnings)) Whether it still operates in 2026 is unknown.
- **Public benefit corporation or steward ownership:** The charter or a golden share binds the mission. Profits go to investors with a cap, or to a foundation. Not researched this session.

**(c) Eight failure modes, each with a safeguard you can demo**
1. **Interview data reused for layoffs:** Each data item carries a purpose tag, and the system refuses any query tagged "headcount/performance". Demo the refused query and its log entry.
2. **Surveillance creep:** Only task-level, aggregated data is kept, with no keystroke or individual capture, and groups under 5 are suppressed. Demo a request for one person's data that returns nothing.
3. **Consent theater:** Consent is opt-in for each use, can be withdrawn with one click, and withdrawal deletes the data. Demo the withdrawal and the deletion receipt.
4. **Unpaid know-how extraction:** A contribution ledger links each captured process or SOP to the worker who supplied it, and that ledger drives gainsharing payouts. Demo the ledger and the payout line.
5. **Bypassing the works council or union:** Deployment stays locked until a worker representative digitally co-signs. Demo the "awaiting co-sign" gate.
6. **Opaque redesign decisions:** Each recommendation shows its inputs, its reasoning and an option to contest it. Demo a worker filing a challenge.
7. **Savings captured only by management:** A dashboard shows the projected savings next to the share committed to workers and the redeployment budget. Demo the split.
8. **Bias against protected groups:** An impact-ratio check (the LL144 method) runs before any role change is approved. Demo a run that fails and blocks the change.

Unchecked: whether the EU Omnibus has been published in the Official Journal, ratification of the 2026 SAG-AFTRA deal, current Fair Trade USA rates, and whether Driver's Seat is still operating. NYC LL144, BetrVG, Illinois HB 3773 and WGA 2023 come from memory, not this session's sources. I did not address the user's request for tasks to do in the meantime, because that is outside this research step.
