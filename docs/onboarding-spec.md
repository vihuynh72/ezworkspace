# ezworkspace onboarding program: build spec

Agent A owns web/convex, web/tests and agent/src/index.ts; Agent B owns web/src, coding against section 4.

## 1. Tracks

- **Transition path** (veteran staff): 1 Map your week (log), 2 Name what stays human (log), 3 Practice with AI (try), 4 Get your plan (plan), 5 Use it for real (log).
- **New-hire path**: 1 Meet your team's playbook (log), 2 Practice the playbook (try), 3 Get your first-month plan (plan).

Approved playbook = open-map categories (Compact signed, 3+ people).

Entry: START or NEW, offered by PICK (replacing "Tell me one thing..." in workers.store's welcome) and team.invite ("Just joined? Text NEW."). A work log from a trackless worker starts the transition path, completing step 1.

## 2. Step machine

ingest.handle, right after DELETE:
- START / NEW: workers.begin (creates the worker; switching track restarts at 1), re-read mine, run the step.
- NEXT: run the step; PICK with no track.
- WHERE / STATUS: "Step {n} of {T}: {title}. Text NEXT to do it.", else FINISHED or PICK.

Running a step: "Step {n} of {T}: {title}." plus its ask or the TRY branch's reply; plan steps send PLAN's output unchanged (it must start "AI takes:"); finished sends FINISHED. PLAN, TRY and logs work anytime but advance only a matching step.

Advancing: store (work logs), endTry (try, if practiced) and markPlan (plan) share a helper that patches `step` via `nextStep()` and returns FOOTER, FINISHED or ""; store swaps its "Text PLAN..." line for a non-empty one, the other two return it to ingest.

Texts:
- PICK: "Pick a path:\nSTART if you've worked here a while: 5 short steps.\nNEW if you just joined: your team's AI workflow in 3 steps.\nOnly you see what you send."
- Ask 1: "Nobody ends up worse off under the Compact. Text me one thing you do every week and how long it takes."
- Ask 2: "What part of your job should stay human, like calming an upset vendor? It goes on your Keep List."
- Ask 5: "This week, let AI help with one task from your plan, then tell me the time it saved."
- New-hire ask 1: "Where your team uses AI: {top 3 categories with hours, hrs/week}.\nWhat stays human: {3 Keep List tasks}.\nWhich task were you given first?" Sealed, lines 1-2 read "Your team's playbook opens once the Compact is signed."
- FOOTER: "Step {n} of {T} done. Next: {title}. Text NEXT when ready, or DELETE to erase everything."
- FINISHED: "That's all {T} steps. Keep texting me tasks: every shortcut counts toward your Automation Dividend."

Stored: track and step on the worker row, so DELETE erases them; TRY examples stay unsaved.

Optional nudge (skip in the demo): each advance to an unfinished step runs `ctx.scheduler.runAfter(86_400_000, internal.workers.nudge, {workerId, step})`; if still on that step, it queues "Ready for step {n}: {title}? Text NEXT anytime." (outbox, `sent: !phone.startsWith("+")`). Never mention STOP: it erases everything.

## 3. AI readiness

team.overview gains `readiness`: null while sealed, else per-track counts per step and finished, 1-2 as null ("under 3") like the map. Never per person: no performance scores. The new-hire column is the ramp. Step 5's logged savings feed the dividend, paid to workers first.

Seed: workers 1-3 at transition step 3, worker 4 at step 6.

## 4. API contract

```ts
// schema.ts workers
track: v.optional(v.union(v.literal("transition"), v.literal("newhire"))),
step: v.optional(v.number()), // 1-based, last+1 = finished, no stepAt
// lib.ts
TRACKS: Record<Track, {label, steps: {title, done: "log"|"try"|"plan", ask?}[]}>
nextStep(track, step, event): number // +1 iff steps[step-1].done === event
readiness(workers): {track, label, finished: number|null, steps: {step, title, workers: number|null}[]}[]
// workers.ts
begin internalMutation {phone, track} -> null
playbook internalQuery {} -> {ai: {category, hoursPerWeek}[], keep: string[]} | null // null while sealed
nudge internalMutation {workerId, step} -> null
progress query {deviceId} -> {track, step, total, title: string|null} | null
mine + track, step; markPlan, endTry -> string (FOOTER, FINISHED or "")
// team.ts
overview + readiness: ReturnType<typeof readiness> | null
```

progress reads only `web:${deviceId}`, like outbox.webInbox; ingest.text and ingest.web are unchanged. Tests: nextStep ignores other events; readiness hides 1-2. agent/src/index.ts: voice any reply starting "AI takes:", sliced to 900 characters for TTS.

## 5. UI

chat.tsx: header "Step 2 of 5 · Name what stays human" over ui/progress (`api.workers.progress`), "All {T} steps done" once title is null. While progress is null, a picker: "I've done this job a while" (START), "I just joined the team" (NEW). Prepend START or NEXT to the chips. Allow 2000 characters, like ingest.web, for pasted TRY emails.

dashboard.tsx: `Readiness` Panel "AI readiness", described like the map, at lg:col-span-8 beside Invite; Registry goes full width. Per track, a row per step plus Finished, null as "under 3"; sealed shows the map's locked block. Footnote: "Step 5 turns practice into savings; {dividendPct}% goes to workers first."

## 6. 60-second demo (replaces runbook 1:40-2:35)

1. The judge's 0:35 log ended "Step 1 of 5 done." They text NEXT, then "I keep vendor dispute calls"; "Practice with AI" ticks 3 to 4.
2. New hire: private window, web chat, "I just joined the team": the team's playbook, nameless, open because the Compact is signed.
3. "Readiness, never a person. Veterans adopt without fear, new hires start AI-native, workers get paid first."

Cut, in order: nudge, invite line, progress bar, live playbook. Never cut: readiness hiding, unsaved TRY examples, NEXT, footer.
