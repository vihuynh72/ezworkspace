# ezworkspace

**Show it once. AI onboards everyone.**

AI is changing every job, and workers are afraid of being replaced. Replacing one clerk costs $24.6k to $98.4k (Gallup on BLS pay), and a bootcamp takes about 14 weeks and $14k (Course Report). ezworkspace takes a different path. A manager shows the AI how a task is done once, and the AI turns it into an SOP. Then it coaches every employee through it, step by step, by voice on the web or by text on iMessage. Nobody gets left behind.

## Try it (no account needed)

| | Where | What to do |
|---|---|---|
| 1 | https://ezworkspace.vercel.app | Watch the short demo loop on the landing page. |
| 2 | Click **Try the employer demo, no sign-in** | Use **Show it in the app** to record yourself working in the demo company app. You can also **Describe it** out loud, or paste a doc link. The AI writes the SOP. Click **Make it clearer** on a step, then **Save & publish**. |
| 3 | Click **Training** (or go to `/#/train`) | Start **Handle an invoice price mismatch**. Talk to the coach with the mic, or tap **I did it** or **I'm stuck**. Ask *"Can I just click Release?"* and watch it correct you. **Check my screen** looks at the demo app only when you tap it. |
| 4 | iMessage: **+1 (415) 590-1577** | Text **START** to train by text, or ask a question mid-task. Photon's free shared line only answers numbers added to the project, so use the presenter's iPhone or ask us to add yours. |
| 5 | https://ezworkspace.vercel.app/acme/index.html | **AcmeAP**, a fictional accounts-payable app to practice in. Every AI suggestion says "AI suggests. You decide." |

**60-second video:** `video/` holds the HyperFrames source. The upload link is in the submission.

## How it works

1. **Teach.** The manager records a task inside the app (only clicks and field names, never typed values), talks it through, uploads a video, or pastes a link (read with Firecrawl). Claude writes the SOP, with a title, steps, and what to check at each step.
2. **Publish.** Every employee gets an iMessage through Photon: *"New training… Reply START."*
3. **Train.** A voice-first coach (Claude, with Google voice and Meta Muse speech-to-text) walks each person through one step at a time. It answers questions from the SOP and gently corrects mistakes. When the person finishes, the skill shows on their private **My progress** page.

## Built to be ethical

- **Nobody ends up worse off.** The training is for growth, not replacement.
- **Private by default.** Employees' questions, chats and screens stay with them, and screen frames are never stored. Employers see completion totals only.
- **Delete anytime.** Texting **DELETE** erases everything about that person.
- **Demo mode.** `DEMO_MODE=1` lets judges act as a mock employer. It's a hackathon shortcut and must be off for real users.

## Stack

Claude (coach, SOP writing, vision), **Photon** Spectrum (iMessage), **Convex** (live backend), **Firecrawl** (reads doc links), Clerk (sign-in), Meta Muse and Google TTS (voice), Vercel (hosting).

## Run locally

```sh
./demo.sh   # Convex (local), the web app on :5173, and the iMessage agent
cd web && bun test tests/   # 18 tests
```

The env vars are set by name only: `ANTHROPIC_API_KEY`, `FIRECRAWL_API_KEY`, `GOOGLE_TTS_API_KEY`, `MUSE_API_KEY`, `CLERK_JWT_ISSUER_DOMAIN`, `AGENT_SECRET` and `DEMO_MODE` in Convex; `PROJECT_ID`, `PROJECT_SECRET`, `CONVEX_URL` and `AGENT_SECRET` in `agent/.env`; `VITE_CLERK_PUBLISHABLE_KEY` in `web/.env.local`. Never commit them.
