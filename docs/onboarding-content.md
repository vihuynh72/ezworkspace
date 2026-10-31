# ezworkspace onboarding content

Lesson copy for the guided onboarding program, ready to paste into code. ezworkspace leads instead of waiting for questions: each step is one iMessage (or web chat) message, sent when the last step's action is done.

Rules every message follows: plain text with no markdown, at most 450 characters (explain answers at most 300), no AI jargon, no company name, and exactly one action at the end. Every claim comes from the Compact terms in `web/PRODUCT.md` and what the code does today (sealed map, team totals only, groups under 3 hidden, TRY examples not saved, DELETE).

## Transition path: veteran staff ("old ops"), 5 steps

A patient coworker, not a course: settle the fear, learn their real week, try AI together on their own work, name what stays theirs, then hand over the plan.

### 1. First, the big question

Goal: Answer the job-loss fear before asking for anything: the Compact and its No Worker Worse Off promise.

Done when: the worker texts NEXT (`done: "next"`). 426/450 characters.

```text
Hi, I'm ezworkspace. I'll help you get comfortable with AI, at your own pace.

First, the big question: will this be used to cut your job? No. Your company only sees team totals, and only after it signs the Compact, a written promise to your team. Its first rule is No Worker Worse Off: no pay cuts or AI layoffs for 12 months, and any change to your role comes with a plan the company pays for.

Reply NEXT when you're ready.
```

### 2. Tell me your week

Goal: Log one real weekly task, including any AI they already use on the side (amnesty and originator credit).

Done when: a work text that workers.store saves (`done: "log"`). 401/450 characters.

```text
Let's start with your real week, not your job description.

What's one task that eats your time? Say it like you'd tell a coworker: "I match invoices to POs, about 5 hours a week."

Already using AI for something on the side? Say so. That's welcome here, it can't be held against you, and you get credit for finding it. Only you see this, and DELETE erases it anytime.

Text me one task, big or small.
```

### 3. Try it together

Goal: First hands-on use of AI on their own example, with them as the reviewer. Nothing is saved.

Done when: the reply to their TRY practice (`done: "try"`). 353/450 characters.

```text
Want to watch AI do a piece of that task? Let's do it together, right here.

I'll ask for one real example, like a vendor email or an invoice line and its PO line. Take out names and account numbers first. You'll see what AI does with it, then you tell me what you'd fix.

Your example isn't saved, and it never goes to your company.

Text TRY to start.
```

### 4. What stays yours

Goal: Log one keep-human task so the plan protects it, and frame their judgment as the part of the job that grows.

Done when: a work text that workers.store saves (`done: "log"`). 336/450 characters.

```text
Whatever you'd fix in an AI draft is the part AI can't do. It doesn't know your vendors, the odd exceptions, or when something just looks wrong. You do. That's years of experience, and it matters more now, not less.

So what's one part of your job you want to keep doing yourself? Text it like: "I want to keep the vendor calls myself."
```

### 5. Your plan

Goal: Send the private transition plan (text and voice note), then leave the door open for questions.

Done when: the PLAN reply (`done: "plan"`). 318/450 characters.

```text
You've done the hard part. Now I can put it all together: what AI takes off your plate, what stays yours, the job you grow into, and one small step for this week.

It's just for you, and it comes as a voice note too, if you'd rather listen. Questions later? Text me anytime, in your own words.

Text PLAN to get yours.
```

## New-hire path: 3 Accounts Payable playbooks

Each message is one playbook: what AI does, what you always check, when to hand it to a person, and a 1-minute practice that runs through TRY on made-up data (Vendor A, no real names or numbers). The practices connect: step 1 finds a $10 price gap, step 2 hides a wrong total ($38 x 12 is $456, not $465), and step 3 writes the email about step 1's gap.

### 1. Invoice matching with AI

Goal: AI flags invoice-to-PO mismatches; the new hire checks every flag and hands risky ones to a person. Practice finds a $10 price gap.

Done when: the reply to their TRY practice (`done: "try"`). 428/450 characters.

```text
Welcome to the team! Playbook 1 of 3: invoice matching with AI.
AI does: lines up each invoice with its PO and flags any price, quantity or vendor that doesn't match.
Always check: every flag, the vendor and the total.
Hand it to a person: a new vendor, a gap over your approval limit, or anything that feels off.
Practice, 1 minute: text TRY. When I reply, send: Invoice 1182: 40 boxes of paper at $5.10. PO: 40 boxes at $4.85.
```

### 2. PDF invoices to data

Goal: AI pulls invoice fields out of PDFs; the new hire checks them so bad numbers and bank-detail fraud stay out. Practice hides a wrong total.

Done when: the reply to their TRY practice (`done: "try"`). 439/450 characters.

```text
Playbook 2 of 3: PDF invoices to data with AI.
AI does: reads the PDF and pulls out the vendor, invoice number, due date, lines and total.
Always check: each field against the PDF, and that the lines add up.
Hand it to a person: blurry or handwritten scans, missing fields, or new bank details.
Practice, 1 minute (one number is off): text TRY, then send: Pull the fields from Vendor A invoice 5521, due Nov 1, 12 toner at $38, total $465.
```

### 3. Exception emails with AI

Goal: AI drafts vendor exception emails; the new hire owns the facts and tone, and disputes and bank-detail changes always go to a person. Practice reuses the $10 gap.

Done when: the reply to their TRY practice (`done: "try"`). 445/450 characters.

```text
Playbook 3 of 3: exception emails with AI.
AI does: drafts a polite email about a problem, like a missing PO or a wrong price.
Always check: every number, the tone, and that it never promises a payment date.
Hand it to a person: upset vendors, talk of lawyers, and any bank detail change (call the number on file to check).
Practice, 1 minute: text TRY, then send: Email Vendor A that invoice 1182 is $10 over the PO and on hold until corrected.
```

## Explain it simply: 6 fears and questions

**Will AI replace me?** (277/300)

> Not through anything you share here. Your company sees none of it until it signs the Compact: no pay cuts or AI layoffs for 12 months, and a company-paid plan for any change to your role. AI takes the repetitive parts. You keep the judgment calls, the people and the final say.

**Is my data private?** (229/300)

> Yes. Your company never sees your messages or your name, only team totals, and any group under 3 people stays hidden. Practice examples from TRY are never saved. Text DELETE anytime and I'll erase everything I've saved about you.

**What if AI is wrong?** (256/300)

> It will be, sometimes. That's why AI only drafts and you decide, the way you'd check a new coworker's work. Anything that moves money, changes bank details or feels off goes to a person. Spotting AI's mistakes is a skill your team needs more now, not less.

**Do I have to use it?** (209/300)

> No. ezworkspace is your choice, and DELETE erases everything anytime. If your team does start using AI tools, practicing here first, privately and at your own pace, makes it easier. Text TRY whenever you like.

**What do I get out of it?** (284/300)

> A private plan for where your job is headed, practice with AI that nobody grades, and a share of the savings. Once your company signs, 30% of what AI saves goes to the people who found it, paid before ezworkspace earns a cent. Came up with a shortcut yourself? You get a bigger share.

**Who sees what I say?** (252/300)

> Only you. Your manager and the COO can't open your messages; there's no screen for that. Your company only sees team totals, like hours saved on invoice matching, and only after 5 of you join and it signs the Compact. Groups under 3 people stay hidden.

## Notes for the engineer

- `done` tells the engine what finishes a step, so it knows when to send the next one: `next` (the worker texts NEXT), `log` (a work text that `workers.store` saves), `try` (the reply to the practice example after TRY), `plan` (the PLAN reply).
- `ingest.ts` doesn't handle NEXT yet. Today NEXT goes to the answer prompt, and in TRY mode it would be taken as the practice example, so check for NEXT before the TRY-mode branch.
- PLAN needs at least one log (veteran steps 2 and 4 create them). TRY needs a worker row, and any first text creates one. New hires have no logs, so their path ends on a practice, not PLAN.
- The copy never names the company. Only "5 of you" (last answer) hard-codes the quorum.
- After pasting, `web/convex/paths.ts` is the source of truth: edit it there and update or delete this file, or the two copies will drift.

## web/convex/paths.ts

```ts
// Guided onboarding copy (docs/onboarding-content.md). Plain text for iMessage, no markdown:
// step texts <= 450 characters, explain answers <= 300. The copy never names the company.
// done is what finishes a step: "next" = the worker texts NEXT, "log" = a work text that
// workers.store saves, "try" = the reply to their TRY practice, "plan" = the PLAN reply.
export const PATHS = {
  // Veteran staff ("old ops"): a patient coworker, one step at a time.
  transition: [
    {
      title: "First, the big question",
      done: "next",
      goal: "Answer the job-loss fear before asking for anything: the Compact and its No Worker Worse Off promise.",
      text:
        "Hi, I'm ezworkspace. I'll help you get comfortable with AI, at your own pace.\n\n" +
        "First, the big question: will this be used to cut your job? No. Your company only sees team totals, " +
        "and only after it signs the Compact, a written promise to your team. Its first rule is No Worker Worse Off: " +
        "no pay cuts or AI layoffs for 12 months, and any change to your role comes with a plan the company pays for.\n\n" +
        "Reply NEXT when you're ready.",
    },
    {
      title: "Tell me your week",
      done: "log",
      goal: "Log one real weekly task, including any AI they already use on the side (amnesty and originator credit).",
      text:
        "Let's start with your real week, not your job description.\n\n" +
        "What's one task that eats your time? Say it like you'd tell a coworker: " +
        "\"I match invoices to POs, about 5 hours a week.\"\n\n" +
        "Already using AI for something on the side? Say so. That's welcome here, it can't be held against you, " +
        "and you get credit for finding it. Only you see this, and DELETE erases it anytime.\n\n" +
        "Text me one task, big or small.",
    },
    {
      title: "Try it together",
      done: "try",
      goal: "First hands-on use of AI on their own example, with them as the reviewer. Nothing is saved.",
      text:
        "Want to watch AI do a piece of that task? Let's do it together, right here.\n\n" +
        "I'll ask for one real example, like a vendor email or an invoice line and its PO line. " +
        "Take out names and account numbers first. You'll see what AI does with it, then you tell me what you'd fix.\n\n" +
        "Your example isn't saved, and it never goes to your company.\n\n" +
        "Text TRY to start.",
    },
    {
      title: "What stays yours",
      done: "log",
      goal: "Log one keep-human task so the plan protects it, and frame their judgment as the part of the job that grows.",
      text:
        "Whatever you'd fix in an AI draft is the part AI can't do. It doesn't know your vendors, the odd exceptions, " +
        "or when something just looks wrong. You do. That's years of experience, and it matters more now, not less.\n\n" +
        "So what's one part of your job you want to keep doing yourself? " +
        "Text it like: \"I want to keep the vendor calls myself.\"",
    },
    {
      title: "Your plan",
      done: "plan",
      goal: "Send the private transition plan (text and voice note), then leave the door open for questions.",
      text:
        "You've done the hard part. Now I can put it all together: what AI takes off your plate, what stays yours, " +
        "the job you grow into, and one small step for this week.\n\n" +
        "It's just for you, and it comes as a voice note too, if you'd rather listen. " +
        "Questions later? Text me anytime, in your own words.\n\n" +
        "Text PLAN to get yours.",
    },
  ],
  // New hires: the team's three Accounts Payable playbooks from day one.
  newhire: [
    {
      title: "Invoice matching with AI",
      done: "try",
      goal: "AI flags invoice-to-PO mismatches; the new hire checks every flag and hands risky ones to a person. Practice finds a $10 price gap.",
      text:
        "Welcome to the team! Playbook 1 of 3: invoice matching with AI.\n" +
        "AI does: lines up each invoice with its PO and flags any price, quantity or vendor that doesn't match.\n" +
        "Always check: every flag, the vendor and the total.\n" +
        "Hand it to a person: a new vendor, a gap over your approval limit, or anything that feels off.\n" +
        "Practice, 1 minute: text TRY. When I reply, send: Invoice 1182: 40 boxes of paper at $5.10. PO: 40 boxes at $4.85.",
    },
    {
      title: "PDF invoices to data",
      done: "try",
      goal: "AI pulls invoice fields out of PDFs; the new hire checks them so bad numbers and bank-detail fraud stay out. Practice hides a wrong total.",
      text:
        "Playbook 2 of 3: PDF invoices to data with AI.\n" +
        "AI does: reads the PDF and pulls out the vendor, invoice number, due date, lines and total.\n" +
        "Always check: each field against the PDF, and that the lines add up.\n" +
        "Hand it to a person: blurry or handwritten scans, missing fields, or new bank details.\n" +
        "Practice, 1 minute (one number is off): text TRY, then send: " +
        "Pull the fields from Vendor A invoice 5521, due Nov 1, 12 toner at $38, total $465.",
    },
    {
      title: "Exception emails with AI",
      done: "try",
      goal: "AI drafts vendor exception emails; the new hire owns the facts and tone, and disputes and bank-detail changes always go to a person. Practice reuses the $10 gap.",
      text:
        "Playbook 3 of 3: exception emails with AI.\n" +
        "AI does: drafts a polite email about a problem, like a missing PO or a wrong price.\n" +
        "Always check: every number, the tone, and that it never promises a payment date.\n" +
        "Hand it to a person: upset vendors, talk of lawyers, and any bank detail change (call the number on file to check).\n" +
        "Practice, 1 minute: text TRY, then send: Email Vendor A that invoice 1182 is $10 over the PO and on hold until corrected.",
    },
  ],
  // "Explain it simply": answers to the common fears and questions.
  explain: [
    {
      q: "Will AI replace me?",
      a:
        "Not through anything you share here. Your company sees none of it until it signs the Compact: no pay cuts " +
        "or AI layoffs for 12 months, and a company-paid plan for any change to your role. AI takes the repetitive parts. " +
        "You keep the judgment calls, the people and the final say.",
    },
    {
      q: "Is my data private?",
      a:
        "Yes. Your company never sees your messages or your name, only team totals, and any group under 3 people " +
        "stays hidden. Practice examples from TRY are never saved. Text DELETE anytime and I'll erase everything " +
        "I've saved about you.",
    },
    {
      q: "What if AI is wrong?",
      a:
        "It will be, sometimes. That's why AI only drafts and you decide, the way you'd check a new coworker's work. " +
        "Anything that moves money, changes bank details or feels off goes to a person. Spotting AI's mistakes is a " +
        "skill your team needs more now, not less.",
    },
    {
      q: "Do I have to use it?",
      a:
        "No. ezworkspace is your choice, and DELETE erases everything anytime. If your team does start using AI tools, " +
        "practicing here first, privately and at your own pace, makes it easier. Text TRY whenever you like.",
    },
    {
      q: "What do I get out of it?",
      a:
        "A private plan for where your job is headed, practice with AI that nobody grades, and a share of the savings. " +
        "Once your company signs, 30% of what AI saves goes to the people who found it, paid before ezworkspace earns " +
        "a cent. Came up with a shortcut yourself? You get a bigger share.",
    },
    {
      q: "Who sees what I say?",
      a:
        "Only you. Your manager and the COO can't open your messages; there's no screen for that. Your company only " +
        "sees team totals, like hours saved on invoice matching, and only after 5 of you join and it signs the Compact. " +
        "Groups under 3 people stay hidden.",
    },
  ],
} as const;
```
