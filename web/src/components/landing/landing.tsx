import { LiveDemo } from "@/components/landing/demo";
import { Connector, SignBand } from "@/components/route";
import { Button } from "@/components/ui/button";
import { SignInButton } from "@clerk/clerk-react";
import { setDemoEmployer } from "@/lib/demo";
import {
  ArrowRightIcon,
  CheckIcon,
  DesktopIcon,
  FileTextIcon,
  LockClosedIcon,
  MobileIcon,
  SpeakerLoudIcon,
  VideoIcon,
} from "@radix-ui/react-icons";
import type { ReactNode } from "react";

const FACTS = [
  {
    figure: "52%",
    text: "of US workers are worried about how AI will be used at work.",
    sources: [["Pew Research Center, 2025", "https://www.pewresearch.org/social-trends/2025/02/25/u-s-workers-are-more-worried-than-hopeful-about-future-ai-use-in-the-workplace/"]],
  },
  {
    figure: "$24.6k–$98.4k",
    text: "to replace one accounts-payable clerk. A bootcamp costs about $14k and 14 weeks away from the job.",
    sources: [
      ["Gallup: 0.5–2x salary", "https://www.gallup.com/workplace/247391/fixable-problem-costs-businesses-trillion.aspx"],
      ["BLS: $49,210 median pay", "https://www.bls.gov/ooh/office-and-administrative-support/bookkeeping-accounting-and-auditing-clerks.htm"],
      ["Course Report", "https://www.coursereport.com/coding-bootcamp-ultimate-guide"],
    ],
  },
  {
    figure: "34%",
    text: "more productive: novice workers with AI help on the job.",
    sources: [["NBER working paper w31161", "https://www.nber.org/papers/w31161"]],
  },
];

const STEPS: { title: string; text: string; ways?: [ReactNode, string][] }[] = [
  {
    title: "Show it once",
    text: "Do the task the way you always do. Nothing to install.",
    ways: [
      [<SpeakerLoudIcon />, "Talk it through"],
      [<DesktopIcon />, "Record it in the app"],
      [<VideoIcon />, "Upload a video"],
      [<FileTextIcon />, "Paste a doc link"],
    ],
  },
  { title: "AI writes the SOP", text: "Plain steps and what to check at each one. You edit it, then publish." },
  {
    title: "AI trains everyone",
    text: "Each employee gets a text. The coach walks them through it, step by step, until they can do it alone.",
    ways: [
      [<MobileIcon />, "iMessage"],
      [<SpeakerLoudIcon />, "Voice on the web"],
      [<DesktopIcon />, "Check my screen"],
    ],
  },
];

const HANDOFF = ["Copying numbers between screens", "Matching invoice lines by hand", "Chasing status updates", "Writing first drafts"];
const GROWTH = ["Judgment calls", "Relationships with vendors and the team", "Improving the process", "Coaching new hires"];

const PROMISES = [
  "Nobody ends up worse off.",
  "Your questions and your screen stay with you.",
  "Your employer sees completion totals only.",
  "You learn on paid time.",
];

const CHANNELS: [ReactNode, string, string, string][] = [
  [<MobileIcon />, "iMessage", "Training arrives as a text. Reply to learn.", "Photon"],
  [<SpeakerLoudIcon />, "Web + voice", "A coach that talks you through each step.", "Meta Muse · Google"],
  [<FileTextIcon />, "Doc links", "Reads the SOPs and guides you already have.", "Firecrawl"],
];

const wrap = "mx-auto w-full max-w-[1280px] px-4 sm:px-8";
const h2 = "text-[2.25rem] font-bold leading-[1.05] tracking-[-0.03em] sm:text-5xl";

function Ctas({ className }: { className?: string }) {
  return (
    <div className={`flex flex-wrap gap-3 ${className ?? ""}`}>
      <SignInButton mode="modal">
        <Button size="lg" className="h-14 bg-signal px-7 text-lg font-bold text-signal-foreground hover:bg-signal/90">
          Employer sign in
        </Button>
      </SignInButton>
      <Button
        asChild
        size="lg"
        variant="outline"
        className="h-14 border-white/60 bg-transparent px-7 text-lg text-white hover:bg-white/10 hover:text-white"
      >
        <a href="#/train">I'm an employee</a>
      </Button>
      <button
        type="button"
        onClick={() => setDemoEmployer(true)}
        className="h-14 px-2 text-lg font-semibold text-white underline decoration-signal decoration-2 underline-offset-[6px] hover:text-signal"
      >
        Try the employer demo, no sign-in
      </button>
    </div>
  );
}

export function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <SignBand className="max-w-[1280px]">
        <nav aria-label="Page sections" className="ml-auto hidden items-center gap-6 text-[0.9375rem] font-semibold md:flex">
          {[
            ["#how", "How it works"],
            ["#worker", "For workers"],
            ["#promise", "Our promise"],
          ].map(([href, label]) => (
            <a key={href} href={href} className="text-white/80 hover:text-white" onClick={(e) => jump(e, href)}>
              {label}
            </a>
          ))}
        </nav>
        <SignInButton mode="modal">
          <Button size="sm" variant="outline" className="ml-auto border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white md:ml-2">
            Sign in
          </Button>
        </SignInButton>
      </SignBand>

      <main>
        <section aria-labelledby="hero-title" className="relative overflow-hidden bg-primary text-primary-foreground">
          <div aria-hidden className="lp-grid pointer-events-none absolute inset-0" />
          <div className={`relative ${wrap} pb-16 pt-10 sm:pt-14 lg:pb-24`}>
            <h1 id="hero-title" className="text-[clamp(2.75rem,6.6vw,6rem)] font-bold leading-[0.98] tracking-[-0.035em]">
              Show it once.
              <br />
              <span className="text-signal">AI onboards everyone.</span>
            </h1>
            <div className="mt-8 grid gap-10 lg:mt-10 lg:grid-cols-12 lg:gap-12">
              <div className="lg:col-span-5 lg:pt-2">
                <p className="text-2xl font-bold leading-snug sm:text-[1.75rem]">
                  AI is changing every job. Nobody should get left behind.
                </p>
                <p className="mt-4 max-w-[40ch] text-lg leading-normal text-white/80">
                  Show the AI how a task is done, one time. It writes the SOP and coaches every employee through it, step by step,
                  on iMessage or by voice.
                </p>
                <Ctas className="mt-8" />
                <p className="mt-6 flex items-center gap-2 text-[0.9375rem] text-white/75">
                  <LockClosedIcon aria-hidden className="shrink-0 text-signal" />
                  Employees' questions and screens stay private.
                </p>
              </div>
              <div className="lg:col-span-7">
                <LiveDemo />
              </div>
            </div>
          </div>
        </section>

        <section aria-labelledby="why-title" className="bg-background">
          <div className={`${wrap} py-20 lg:py-28`}>
            <h2 id="why-title" className={h2}>
              Teaching beats replacing.
            </h2>
            <p className="mt-4 max-w-[52ch] text-xl leading-normal text-muted-foreground">
              AI is coming to every team. Bringing your people with you is cheaper, faster and fairer than starting over.
            </p>
            <dl className="mt-12 border-t-2 border-foreground">
              {FACTS.map((f) => (
                <div key={f.figure} className="grid gap-x-10 gap-y-3 border-b py-8 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:items-baseline">
                  <dt className="whitespace-nowrap text-[clamp(2.5rem,5vw,4.25rem)] font-bold leading-none tracking-[-0.03em] tabular-nums">
                    {f.figure}
                  </dt>
                  <dd>
                    <p className="max-w-[42ch] text-xl font-bold leading-snug sm:text-2xl">{f.text}</p>
                    <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      {f.sources.map(([label, href]) => (
                        <a key={href} href={href} target="_blank" rel="noreferrer" className="underline hover:text-foreground">
                          {label}
                        </a>
                      ))}
                    </p>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section id="how" aria-labelledby="how-title" className="scroll-mt-4 border-y bg-card">
          <div className={`${wrap} py-20 lg:py-28`}>
            <h2 id="how-title" className={h2}>
              How it works
            </h2>
            <ol className="mt-12 grid gap-10 md:grid-cols-[1fr_minmax(24px,72px)_1fr_minmax(24px,72px)_1fr] md:gap-x-4">
              {STEPS.map((s, i) => (
                <li key={s.title} className="contents">
                  {i > 0 && <Connector done={false} className="mt-6 hidden md:block" />}
                  <div>
                    <span aria-hidden className="grid h-12 w-12 place-items-center rounded-full bg-primary text-xl font-bold text-signal">
                      {i + 1}
                    </span>
                    <h3 className="mt-5 text-2xl font-bold tracking-[-0.02em]">{s.title}</h3>
                    <p className="mt-2 max-w-[34ch] text-lg leading-normal text-muted-foreground">{s.text}</p>
                    {s.ways && (
                      <ul className="mt-5 flex flex-wrap gap-2">
                        {s.ways.map(([icon, label]) => (
                          <li key={label} className="inline-flex items-center gap-1.5 rounded-md border bg-background px-2.5 py-1 text-sm font-semibold">
                            <span aria-hidden className="text-muted-foreground">
                              {icon}
                            </span>
                            {label}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="worker" aria-labelledby="worker-title" className="scroll-mt-4 bg-background">
          <div className={`${wrap} py-20 lg:py-28`}>
            <h2 id="worker-title" className={`${h2} max-w-[20ch]`}>
              AI takes the busywork. You grow into the rest.
            </h2>
            <p className="mt-4 max-w-[56ch] text-xl leading-normal text-muted-foreground">
              Training is for growth, not replacement. Workers learn to do their job faster with AI, then move up to the parts only
              people can do.
            </p>
            <div className="mt-12 grid items-stretch gap-4 md:grid-cols-[1fr_auto_1.15fr]">
              <div className="rounded-lg border bg-muted p-6 sm:p-8">
                <h3 className="text-lg font-bold text-muted-foreground">AI takes over</h3>
                <ul className="mt-4 space-y-3">
                  {HANDOFF.map((t) => (
                    <li key={t} className="flex items-start gap-3 text-lg text-muted-foreground">
                      <span aria-hidden className="mt-[0.6rem] h-0.5 w-4 shrink-0 bg-input" />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
              <div aria-hidden className="grid place-items-center">
                <span className="grid h-12 w-12 rotate-90 place-items-center rounded-full bg-signal text-signal-foreground md:rotate-0">
                  <ArrowRightIcon className="h-6 w-6" />
                </span>
              </div>
              <div className="rounded-lg bg-primary p-6 text-primary-foreground shadow-[0_24px_48px_-28px_rgb(0_0_0/0.6)] sm:p-8">
                <h3 className="text-lg font-bold text-signal">You grow into</h3>
                <ul className="mt-4 space-y-3">
                  {GROWTH.map((t) => (
                    <li key={t} className="flex items-start gap-3 text-2xl font-bold leading-snug tracking-[-0.01em]">
                      <ArrowRightIcon aria-hidden className="mt-1.5 h-5 w-5 shrink-0 text-signal" />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section id="promise" aria-labelledby="promise-title" className="scroll-mt-4 bg-primary text-primary-foreground">
          <div className={`${wrap} grid gap-12 py-20 lg:grid-cols-12 lg:items-center lg:py-28`}>
            <div className="lg:col-span-5">
              <h2 id="promise-title" className={h2}>
                Our promise to every employee.
              </h2>
              <p className="mt-4 max-w-[36ch] text-xl leading-normal text-white/80">
                Written down and signed, so nobody has to take it on faith.
              </p>
            </div>
            <figure className="rounded-lg bg-card p-6 text-card-foreground shadow-[0_40px_70px_-35px_rgb(0_0_0/0.9)] sm:p-10 lg:col-span-7">
              <ol className="divide-y">
                {PROMISES.map((p) => (
                  <li key={p} className="flex items-center gap-4 py-4 text-xl font-bold leading-snug sm:text-2xl">
                    <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-go text-white">
                      <CheckIcon className="h-5 w-5" />
                    </span>
                    {p}
                  </li>
                ))}
              </ol>
              <figcaption className="mt-6 flex flex-wrap items-end justify-between gap-4 border-t-2 border-foreground pt-3">
                <div>
                  <Signature />
                  <p className="text-sm text-muted-foreground">Signed, the ezworkspace team</p>
                </div>
                <span className="-rotate-6 rounded-md border-2 border-go px-3 py-1 text-sm font-bold tracking-[0.08em] text-go">
                  SIGNED
                </span>
              </figcaption>
            </figure>
          </div>
        </section>

        <section aria-labelledby="where-title" className="bg-card">
          <div className={`${wrap} py-20 lg:py-28`}>
            <h2 id="where-title" className={h2}>
              Works where people already are.
            </h2>
            <p className="mt-4 max-w-[52ch] text-xl leading-normal text-muted-foreground">
              No new app to learn. Training shows up as a text, or opens in the browser with a voice coach.
            </p>
            <div className="mt-12 overflow-hidden rounded-lg bg-primary text-primary-foreground">
              <ul className="divide-y divide-white/10">
                {CHANNELS.map(([icon, name, text, partner]) => (
                  <li key={name} className="grid grid-cols-[auto_1fr] items-center gap-x-5 gap-y-1 px-5 py-5 sm:grid-cols-[auto_12rem_1fr_auto] sm:px-8">
                    <span aria-hidden className="row-span-2 grid h-12 w-12 place-items-center rounded-md bg-white text-foreground sm:row-span-1 [&_svg]:h-6 [&_svg]:w-6">
                      {icon}
                    </span>
                    <span className="text-xl font-bold">{name}</span>
                    <span className="text-white/75 sm:text-lg">{text}</span>
                    <span className="col-start-2 text-[0.9375rem] font-semibold text-white/75 sm:col-start-auto sm:text-right">
                      with <span className="font-bold text-white">{partner}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <p className="border-t border-white/10 bg-black/20 px-5 py-4 text-[0.9375rem] text-white/75 sm:px-8">
                Built on <b className="text-white">Convex</b> (live backend), <b className="text-white">Clerk</b> (sign-in) and{" "}
                <b className="text-white">Claude</b> (the coach).
              </p>
            </div>
          </div>
        </section>

        <section aria-labelledby="cta-title" className="relative overflow-hidden bg-primary text-primary-foreground">
          <div aria-hidden className="lp-grid pointer-events-none absolute inset-0" />
          <div className={`relative ${wrap} py-20 lg:py-28`}>
            <h2 id="cta-title" className="max-w-[16ch] text-[clamp(2.5rem,5.5vw,4.5rem)] font-bold leading-[1] tracking-[-0.035em]">
              Show it once. <span className="text-signal">Nobody gets left behind.</span>
            </h2>
            <Ctas className="mt-10" />
          </div>
        </section>
      </main>
      <footer className="bg-primary text-primary-foreground">
        <div className={`${wrap} border-t border-white/10 py-6 text-sm text-white/70`}>ezworkspace. Built for the people doing the work.</div>
      </footer>
    </div>
  );
}

// Smooth in-page jump that keeps the hash router (#/train) free of section anchors.
function jump(e: React.MouseEvent, href: string) {
  e.preventDefault();
  document.querySelector(href)?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
}

function Signature() {
  return (
    <svg viewBox="0 0 220 56" className="h-12 w-auto text-foreground" aria-hidden>
      <path
        d="M6 38c10-14 20-26 26-24 5 2-6 26-2 28 5 2 14-20 20-19 5 1-2 15 3 16 6 1 12-12 18-12 4 0 2 9 7 9 7 0 13-14 21-14 6 0-1 12 5 12 8 0 16-16 26-16 7 0 2 10 9 10 10 0 22-8 36-12 12-3 24-2 32 1"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
