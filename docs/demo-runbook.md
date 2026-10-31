# ezworkspace demo runbook (table, 9:00pm)

## T-30 checklist

- [ ] `./demo.sh` running: Convex, web on http://localhost:5173, agent (`bun start`).
- [ ] Wi-Fi up; iPhone hotspot joined once as backup.
- [ ] iPhone charged, Focus off, sound on, open on the ezworkspace thread (Photon line enrolled).
- [ ] Dashboard: **COO sign in** done.
- [ ] Footer: **Reset demo**, then **Click again to reset all demo data**. Check "4 of 5 voices joined. The map is sealed."
- [ ] Nebula tab open (**Run the redesign in Nebula** appears once the map opens).
- [ ] Web chat tab on http://localhost:5173/#/text. Tap the mic once to allow it. Laptop volume up.
- [ ] Public registry: run **Check public news** for "Acme Insurance", then "Klarna". Hits go to human review.
- [ ] Screenshot of the open map and backup video on the desktop.

## The 3 minutes

**0:00 Problem.** Say: "57% of workers hide their AI use ([HRGrapevine](https://www.hrgrapevine.com/us/content/article/2025-05-02-covert-use-of-artificial-intelligence-at-work-poses-risk-study-finds)). Showing the hours AI saves you feels like volunteering to be replaced. Firing, rehiring or AI courses cost more than helping people change inside their own job."

**0:20 Product.** "A private AI coach workers text or talk to. Acme Insurance's AP team: four joined, you're fifth." Hand over the iPhone.

**0:35 Work log.** Judge texts:
`I use ChatGPT to draft vendor emails, saves 2 hours a week`
Meanwhile, click **Show me who said what**. Say: "Even I can't see your answer. There's no endpoint for that." The counter goes to 5 of 5 (Quorum reached).

**1:05 COO signs.** Click **Sign as {name}** in The Compact panel. Say: "No pay cuts or AI layoffs for 12 months, and a funded plan for any role change. Paid time to learn. Amnesty for shadow AI. Team totals only." The judge's phone buzzes. The map opens.

**1:20 Value card.** Point at **What it's worth**. Say: "About a tenth of the team's time comes back: 21 hours a week, about $13.1k of time a quarter." Read the figures off the card (demo seed: about 11%, 21 hrs/week, $13,104).

**1:35 PLAN voice note.** Judge texts `PLAN`. While Claude writes, switch to the Nebula tab: "An agent drafts each exception email. The worker approves every draft." The plan lands, then the voice note. Tap play for a few seconds.

**2:00 Publish to team.** In **Playbooks**, click **Publish to team** on a teammate's shortcut. Say: "Workers pass shortcuts up with SHARE. Leadership publishes the best ones down."

**2:15 Business case.** Point at **Compared with** on the card. Say: "Replacing one clerk costs $24.6k to $98.4k. A bootcamp is about $14k and 14 weeks per person, and the work doesn't change. We keep people and move them into AI-era work."

**2:45 Close.** "I'm Vi, from SJSU's Responsible Computing Club. I'm looking for three design-partner COOs. Who should I meet?"

**Spare time:** judge texts `TRY`, then one example:
`Hi Dana, invoice 4471 is missing a PO number, can you send it so we can pay this week?`
"Learn by doing. Nothing stored or sent."

## Voice-first demo (web chat)

For a judge who'd rather talk, or when the iPhone is out. Same backend, same 5 of 5, same map.

1. On the web chat tab, tap the mic.
2. Judge says: "I use ChatGPT to draft vendor emails. It saves me two hours a week." The coach answers out loud.
3. Judge says: "Make me a plan." The plan is read aloud.
4. Go on from **1:05 COO signs**.

Mic not live yet? Type it, then tap **Listen** on the reply.

## Between judges (about 30 s)

1. Text `DELETE` on the judge's iPhone thread. If they used web chat: **Delete my data**, then **Tap again to erase**.
2. Click **Reset demo**, then **Click again to reset all demo data**. Check that it shows 4 of 5, sealed, not signed, and **Publish to team** is back.

## Fallbacks

- **iMessage lags (more than 20 s):** Switch to the web chat tab and run the voice-first demo. No mic? Type the task, then tap **Make me a plan**.
- **Judge sends a voice memo or wants to call:** The agent asks them to type. Calls need Photon's Business plan, so they're off tonight. Offer the web chat mic.
- **Claude is slow:** Talk over Nebula. On a Claude error the template plan sends automatically (no timeout in code, so slow just waits).
- **Value card or Playbooks not live:** Say the 1:20 and 2:00 lines over the open map. The numbers are in `docs/value-model.md`.
- **Wi-Fi dies:** iPhone hotspot; else screenshot and video.
- **Sign-in fails:** second browser profile. Never show the Convex data browser.

## 30-second walk-by

"Workers hide AI use because it feels like volunteering to be replaced. ezworkspace is a private coach they text or talk to: a plan to grow into their own job, plus the team's redesign map, which the COO sees only after signing no pay cuts or AI layoffs for 12 months and paid time to learn. It's cheaper and faster than replacing people or sending them to courses. Falling behind on AI is no longer a reason to let someone go. Want to be worker five?" Hold out the phone.
