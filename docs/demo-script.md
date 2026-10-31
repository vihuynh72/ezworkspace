# ezworkspace demo: "Show it once. AI onboards everyone." (3 minutes)

**Setup (T-10):**
- Laptop tab 1 is https://ezworkspace.vercel.app, signed in as the employer. It shows Teach the AI.
- Tab 2 is https://ezworkspace.vercel.app/#/train, the employee view.
- Tab 3 is https://ezworkspace.vercel.app/acme/index.html, the AcmeAP practice app.
- iPhone is open on the ezworkspace iMessage thread.

## 0:00: The problem (20s)
"AI is changing every back-office job. Companies either replace people or send them to courses that don't stick. 52% of workers are worried about AI at work (Pew). Replacing one clerk costs $24k to $98k (Gallup x BLS). We think there's a better way: teach the AI how your team works once, and let it onboard everyone."

## 0:20: The employer teaches the AI (45s)
On the Teach the AI page, click **Describe it**, tap the mic and say:
> "When an invoice price doesn't match the PO, put it on hold. Check the receiving record. Email the vendor with our price-mismatch template. If the difference is over five thousand dollars, escalate to the AP lead. Log it and release it once it's fixed."

- AI writes the SOP: a title, steps, and what to check at each step.
- Say: "It can also learn from a screen recording, a training video, or a link to an existing doc. Firecrawl reads the link."
- Click **Save & publish to employees**.

## 1:05: Employees get it on iMessage (20s)
Your iPhone buzzes: *"New training: … Reply START to begin."* Reply **START** and step 1 arrives in iMessage (Photon).
Say: "No app to install. It meets people where they already are."

## 1:25: Guided, voice-first training (60s)
Switch to tab 2, the employee view, and **Start** the training.
- The coach speaks step 1. Tap the mic and answer out loud.
- Open tab 3 (the practice invoice). Back in tab 2, tap **Check my screen** and share tab 3.
- AI: *"I can see the $160 price mismatch… next, check the receiving record."*
- Say: "It only looks when the employee taps. Nothing is saved."
- Tap **I did it** a few times until you see *Skill earned*. Then show **My progress**: level up, skill earned.

## 2:25: Ethics and business (35s)
- "Employees' questions and screens stay with them. The employer sees completion totals only."
- "The promise: nobody ends up worse off. Learning happens on paid time."
- "It's cheaper than replacing people and faster than a course. And research shows new workers gain the most from AI help: +34% for novices (NBER)."
- "We built ezworkspace so AI brings people along instead of leaving them behind."

## If something fails
- **iMessage slow:** "It also works right here on the web." Go straight to tab 2.
- **Mic blocked:** type the same sentence.
- **Screen share denied:** tap **I did it** and keep going.
- **Reset between judges:** run `cd web && npx convex run seed:run` in the cloud copy, or click Remove on the published training and publish again.
