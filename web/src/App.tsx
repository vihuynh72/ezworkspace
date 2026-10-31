import { Dashboard } from "@/components/dashboard";
import { Connector, SignBand, StopCircle } from "@/components/route";
import { compactTerms } from "@/components/terms";
import { Button } from "@/components/ui/button";
import { SignInButton } from "@clerk/clerk-react";
import { CheckCircledIcon } from "@radix-ui/react-icons";
import { AuthLoading, Authenticated, Unauthenticated } from "convex/react";

const STOPS = [
  ["5 workers text in", "Each one privately, by iMessage or web chat"],
  ["The COO signs the Compact", "Four promises, stamped with a name"],
  ["The team map opens", "Totals only. Groups under 3 stay hidden."],
];

export default function App() {
  return (
    <>
      <Authenticated>
        <Dashboard />
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
      <main className="mx-auto grid w-full max-w-[1200px] flex-1 content-center gap-x-16 gap-y-10 px-4 py-10 sm:px-8 lg:grid-cols-12 lg:py-14">
        <div className="lg:col-span-7">
          <h1 className="text-[2.75rem] font-bold leading-[1.04] tracking-[-0.03em] sm:text-[4rem]">
            Bring your people into the AI era.
            <span className="mt-4 block text-[1.75rem] leading-tight tracking-[-0.02em] sm:text-[2.25rem]">
              Nobody ends up worse off.
            </span>
          </h1>
          <p className="mt-5 max-w-[40ch] text-xl leading-normal text-muted-foreground sm:text-[1.375rem]">
            A private AI coach every worker can text or talk to. Cheaper and faster than firing, re-hiring or
            retraining.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <SignInButton mode="modal">
              <Button size="lg" className="h-12 px-6 text-base">
                COO sign in
              </Button>
            </SignInButton>
            <Button asChild size="lg" variant="outline" className="h-12 border-input px-6 text-base">
              <a href="#/text">Try the worker chat</a>
            </Button>
          </div>
        </div>
        <section aria-labelledby="guarantees-title" className="lg:col-span-5 lg:self-center">
          <h2 id="guarantees-title" className="text-xl font-bold tracking-[-0.01em]">
            What every worker is promised
          </h2>
          <ul className="mt-3 divide-y border-y">
            {compactTerms().map(([title, text]) => (
              <li key={title} className="flex gap-3 py-4">
                <CheckCircledIcon aria-hidden className="mt-1 h-5 w-5 shrink-0 text-go" />
                <div>
                  <p className="text-lg font-bold leading-snug">{title}</p>
                  <p className="mt-0.5 text-muted-foreground">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </main>
      <section aria-labelledby="route-title" className="border-t bg-card">
        <div className="mx-auto max-w-[1200px] px-4 py-7 sm:px-8">
          <h2 id="route-title" className="text-xl font-bold tracking-[-0.01em]">
            How the team map opens
          </h2>
          <ol className="mt-4 grid gap-4 sm:grid-cols-[auto_minmax(16px,1fr)_auto_minmax(16px,1fr)_auto] sm:items-start sm:gap-x-3">
            {STOPS.map(([title, text], i) => (
              <li key={title} className="contents">
                {i > 0 && <Connector done={false} className="mt-[14px] hidden sm:block" />}
                <div className={i === 0 ? "" : "sm:text-center"}>
                  <div className={i === 0 ? "flex h-8 items-center" : "flex h-8 items-center sm:justify-center"} aria-hidden>
                    {i === 0 ? (
                      Array.from({ length: 5 }, (_, d) => (
                        <span key={d} className="flex items-center">
                          {d > 0 && <Connector done={false} className="w-3 flex-none sm:w-5" />}
                          <span className="block h-[18px] w-[18px] rounded-full bg-primary" />
                        </span>
                      ))
                    ) : (
                      <StopCircle done={false} lock={i === 2} />
                    )}
                  </div>
                  <p className="mt-2 font-bold">{title}</p>
                  <p className="text-sm text-muted-foreground">{text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </div>
  );
}
