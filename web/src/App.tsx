import { Connector, SignBand } from "@/components/route";
import { Teach } from "@/components/teach";
import { Button } from "@/components/ui/button";
import { SignInButton } from "@clerk/clerk-react";
import { CheckCircledIcon } from "@radix-ui/react-icons";
import { AuthLoading, Authenticated, Unauthenticated } from "convex/react";

const STEPS = [
  ["Show it", "Talk it through, record your screen, upload a video or paste a link."],
  ["AI writes the SOP", "Clear steps and what to check. You edit it and publish."],
  ["AI trains everyone", "Step by step, by voice on the web or by iMessage."],
];

const PROMISES = [
  "Nobody ends up worse off.",
  "Questions and screens stay with the employee.",
  "Employers see completion totals only.",
  "Learning happens on paid time.",
];

export default function App() {
  return (
    <>
      <Authenticated>
        <Teach />
      </Authenticated>
      <Unauthenticated>
        <Hero />
      </Unauthenticated>
      <AuthLoading>
        <SignBand />
      </AuthLoading>
    </>
  );
}

function Hero() {
  return (
    <div className="flex min-h-screen flex-col">
      <SignBand />
      <main className="flex-1 bg-primary text-primary-foreground">
      <div className="mx-auto grid w-full max-w-[1200px] content-center gap-x-16 gap-y-10 px-4 pb-14 pt-10 sm:px-8 lg:grid-cols-12 lg:pb-20 lg:pt-16">
        <div className="lg:col-span-7">
          <h1 className="text-[2.75rem] font-bold leading-[1.04] tracking-[-0.03em] sm:text-[4.5rem]">
            Show it once. <span className="text-signal">AI onboards everyone.</span>
          </h1>
          <p className="mt-6 max-w-[44ch] text-xl leading-normal text-white/80 sm:text-[1.375rem]">
            Teach the AI how your team works by talking, recording your screen, or sharing a doc. It writes the SOP
            and trains every employee, by voice, web and iMessage.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <SignInButton mode="modal">
              <Button size="lg" className="h-14 bg-signal px-7 text-lg font-bold text-signal-foreground hover:bg-signal/90">
                Employer sign in
              </Button>
            </SignInButton>
            <Button asChild size="lg" variant="outline" className="h-14 border-white/60 bg-transparent px-7 text-lg text-white hover:bg-white/10 hover:text-white">
              <a href="#/train">I'm an employee</a>
            </Button>
          </div>
        </div>
        <section aria-labelledby="promise-title" className="rounded-lg bg-card p-6 text-card-foreground shadow-[0_12px_32px_-12px_rgb(0_0_0/0.5)] sm:p-7 lg:col-span-5 lg:self-center">
          <h2 id="promise-title" className="text-xl font-bold tracking-[-0.01em]">
            Our promise to every employee
          </h2>
          <ul className="mt-3 divide-y">
            {PROMISES.map((text) => (
              <li key={text} className="flex gap-3 py-4">
                <CheckCircledIcon aria-hidden className="mt-1 h-5 w-5 shrink-0 text-go" />
                <p className="text-lg font-bold leading-snug">{text}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>
      </main>
      <section aria-labelledby="steps-title" className="border-t bg-card">
        <div className="mx-auto max-w-[1200px] px-4 py-10 sm:px-8">
          <h2 id="steps-title" className="text-xl font-bold tracking-[-0.01em]">
            How it works
          </h2>
          <ol className="mt-4 grid gap-4 sm:grid-cols-[1fr_minmax(16px,64px)_1fr_minmax(16px,64px)_1fr] sm:items-start sm:gap-x-3">
            {STEPS.map(([title, text], i) => (
              <li key={title} className="contents">
                {i > 0 && <Connector done={false} className="mt-[18px] hidden sm:block" />}
                <div>
                  <span
                    aria-hidden
                    className="grid h-10 w-10 place-items-center rounded-full bg-signal text-lg font-bold text-signal-foreground"
                  >
                    {i + 1}
                  </span>
                  <p className="mt-3 text-lg font-bold">{title}</p>
                  <p className="mt-1 max-w-[34ch] text-muted-foreground">{text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </div>
  );
}
