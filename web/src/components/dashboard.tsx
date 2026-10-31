import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { UserButton, useUser } from "@clerk/clerk-react";
import {
  ArrowRightIcon,
  CheckCircledIcon,
  CircleIcon,
  ExclamationTriangleIcon,
  ExternalLinkIcon,
  EyeNoneIcon,
  LockClosedIcon,
  ReloadIcon,
} from "@radix-ui/react-icons";
import { useAction, useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { ConvexError } from "convex/values";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { api } from "../../convex/_generated/api";
import { Connector, DonePlate, NextPlate, SignBand, StopCircle, VoiceDot } from "./route";

export type Overview = NonNullable<FunctionReturnType<typeof api.team.overview>>;
type Payout = NonNullable<Overview["payout"]>;

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const hours = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 1 });
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
// Backend ConvexErrors carry user-facing text ("Enter a phone number like ..."); anything else gets the fallback.
const errorText = (e: unknown, fallback: string) => (e instanceof ConvexError ? String(e.data) : fallback);
const NEBULA_URL = import.meta.env.VITE_NEBULA_URL as string | undefined;

export function Dashboard() {
  const data = useQuery(api.team.overview);
  if (data === undefined) {
    return (
      <Shell>
        <p className="mx-auto max-w-[1376px] px-4 py-10 text-muted-foreground sm:px-8">Loading your team…</p>
      </Shell>
    );
  }
  if (data === null) {
    return (
      <Shell>
        <div className="mx-auto max-w-[1376px] px-4 py-10 sm:px-8">
          <p className="text-lg font-bold">No demo team yet.</p>
          <p className="mt-1 text-muted-foreground">Reset the demo to seed Accounts Payable at Acme Insurance.</p>
          <ResetDemo className="mt-4" />
        </div>
      </Shell>
    );
  }
  return <DashboardView data={data} />;
}

function Shell({ team, children }: { team?: Overview["team"]; children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <SignBand>
        {team && (
          <p className="min-w-0 truncate border-l border-white/25 pl-4 text-white/80">
            {team.name} <span aria-hidden>·</span> {team.company}
          </p>
        )}
        <div className="ml-auto flex items-center">
          <UserButton />
        </div>
      </SignBand>
      {children}
    </div>
  );
}

export function DashboardView({ data }: { data: Overview }) {
  return (
    <Shell team={data.team}>
      <RouteStrip data={data} />
      <main className="mx-auto grid max-w-[1376px] items-start gap-4 px-4 py-4 sm:px-8 lg:grid-cols-12">
        <Compact
          compact={data.compact}
          company={data.team.company}
          next={data.voices >= data.quorum}
          className="lg:col-span-4"
        />
        <TeamMap data={data} className="lg:col-span-5" />
        <PayoutPanel payout={data.payout} company={data.team.company} className="lg:col-span-3" />
        <Registry className="lg:col-span-8" />
        <Invite className="lg:col-span-4" />
      </main>
      <footer className="mx-auto flex max-w-[1376px] flex-wrap items-center justify-between gap-4 px-4 pb-8 pt-2 sm:px-8">
        <a
          href="#/text"
          target="_blank"
          rel="noopener"
          className="inline-flex items-center gap-1.5 rounded-sm font-semibold underline hover:no-underline"
        >
          Worker web chat
          <ExternalLinkIcon aria-hidden className="h-4 w-4" />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
        <ResetDemo />
      </footer>
    </Shell>
  );
}

function Panel({
  id,
  title,
  description,
  action,
  stop,
  className,
  children,
}: {
  id: string;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  /** The route stop this panel belongs to, repeated small before the title. */
  stop?: { done: boolean; lock?: boolean };
  className?: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className={cn("rounded-lg border bg-card p-5", className)}>
      {/* min-h-9 fits an action on the title row, so descriptions line up across panels. */}
      <div className="flex min-h-9 flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h2 id={id} className="flex items-center gap-2.5 text-lg font-bold leading-snug">
          {stop && <StopCircle size="sm" {...stop} />}
          {title}
        </h2>
        {action}
      </div>
      {description && <p className="mt-0.5 text-pretty text-[15px] text-foreground/75">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

/* ---------- The route: voices, then the Compact, then the map ---------- */

function RouteStrip({ data: { voices, quorum, compact, sealed } }: { data: Overview }) {
  const missing = Math.max(quorum - voices, 0);
  const voicesDone = missing === 0;
  const signed = compact !== null;
  // Replay the pop only for a voice that arrives while the page is open: the live moment.
  const prev = useRef(voices);
  const [fresh, setFresh] = useState<number | null>(null);
  useEffect(() => {
    if (voices > prev.current) setFresh(voices - 1);
    prev.current = voices;
  }, [voices]);

  const voiceStatus = voicesDone ? (
    <Done>Quorum reached</Done>
  ) : (
    <NextPlate key="voices">{plural(missing, "more voice")} needed</NextPlate>
  );
  const compactStatus = signed ? (
    <Done>Signed</Done>
  ) : voicesDone ? (
    <NextPlate key="compact" href="#compact-sign">
      Sign the Compact
    </NextPlate>
  ) : (
    <Waiting>Not signed yet</Waiting>
  );
  const mapStatus = sealed ? <Waiting>Sealed</Waiting> : <DonePlate>Open</DonePlate>;

  return (
    <section aria-labelledby="route-title" className="border-b bg-card">
      <h2 id="route-title" className="sr-only">
        Route to the team map
      </h2>
      {/* Full route from lg only: at sign size it needs ~700px of line. */}
      <div className="mx-auto flex max-w-[1376px] flex-col gap-3 px-4 py-3 sm:px-8 lg:flex-row lg:items-center lg:gap-10">
        <div className="flex shrink-0 items-baseline gap-2 lg:block">
          <p className="leading-none" aria-hidden>
            <span key={voices} className="inline-block animate-rise text-6xl font-bold tabular-nums tracking-[-0.02em]">
              {voices}
            </span>
            <span className="text-3xl font-bold text-muted-foreground"> / {quorum}</span>
          </p>
          <p className="text-base font-semibold text-muted-foreground lg:mt-1.5">voices joined</p>
          <p aria-live="polite" className="sr-only">
            {voices} of {quorum} voices joined. {sealed ? "The map is sealed." : "The map is open."}
          </p>
        </div>

        <div className="grid min-w-0 flex-1 grid-cols-[auto_minmax(16px,1fr)_auto_minmax(16px,1fr)_auto] items-center gap-x-3 gap-y-1.5">
          <div className="flex items-center" aria-hidden>
            {Array.from({ length: Math.max(quorum, voices) }, (_, i) => (
              <span key={i} className="flex items-center">
                {i > 0 && <Connector done={i < voices} className="w-3 flex-none sm:w-5" />}
                <VoiceDot key={fresh === i ? `fresh-${voices}` : i} filled={i < voices} fresh={fresh === i} />
              </span>
            ))}
          </div>
          <Connector done={voicesDone} />
          <div className="justify-self-center">
            <StopCircle done={signed} size="lg" />
          </div>
          <Connector done={voicesDone && signed} />
          <div className="justify-self-center">
            <StopCircle done={!sealed} lock size="lg" />
          </div>

          <StopLabel className="justify-self-start">Workers join privately</StopLabel>
          <span />
          <StopLabel className="justify-self-center">COO signs the Compact</StopLabel>
          <span />
          <StopLabel className="justify-self-center">Team map opens</StopLabel>

          <div className="hidden justify-self-start lg:block">{voiceStatus}</div>
          <span className="hidden lg:block" />
          <div className="hidden justify-self-center lg:block">{compactStatus}</div>
          <span className="hidden lg:block" />
          <div className="hidden justify-self-center lg:block">{mapStatus}</div>
        </div>
        {/* Phones and tablets get one line: what happens next. */}
        <div className="lg:hidden">{!voicesDone ? voiceStatus : !signed ? compactStatus : mapStatus}</div>
      </div>
    </section>
  );
}

function StopLabel({ className, children }: { className?: string; children: ReactNode }) {
  return <p className={cn("hidden whitespace-nowrap text-lg font-bold lg:block", className)}>{children}</p>;
}

function Done({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 py-1 text-base font-bold text-go">
      <CheckCircledIcon aria-hidden className="h-5 w-5" />
      {children}
    </span>
  );
}

function Waiting({ children }: { children: ReactNode }) {
  return <span className="inline-block py-1 text-base text-muted-foreground">{children}</span>;
}

/* ---------- The Compact ---------- */

function Compact({
  compact,
  company,
  next,
  className,
}: {
  compact: Overview["compact"];
  company: string;
  /** Quorum is in, so signing is the team's next step: the button takes the yellow. */
  next: boolean;
  className?: string;
}) {
  const sign = useMutation(api.team.signCompact);
  const { user } = useUser();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const name = user?.fullName || user?.primaryEmailAddress?.emailAddress || "COO";
  const months = compact?.floorMonths ?? 12;
  const pct = compact?.dividendPct ?? 30;
  const terms: [string, string][] = [
    ["No Worker Worse Off.", `No pay cuts or AI layoffs for ${months} months. Any role change comes with a funded transition plan.`],
    ["Automation Dividend.", `${pct}% of measured AI savings goes to the workers who surfaced them, paid before ezworkspace's fee.`],
    ["Amnesty and credit.", "Hidden AI use is never held against anyone, and whoever found a shortcut gets credit for it."],
    ["Team totals only.", "No one's individual answers are shown. Groups under 3 people stay hidden."],
  ];
  const Icon = compact ? CheckCircledIcon : CircleIcon;
  return (
    <Panel
      id="compact-title"
      title="The Compact"
      description={`Four promises ${company} signs before it sees the map.`}
      stop={{ done: compact !== null }}
      className={className}
    >
      <ul className="space-y-3">
        {terms.map(([name, text]) => (
          <li key={name} className="flex gap-2.5 text-[15px] leading-snug">
            <Icon
              aria-hidden
              className={cn("mt-0.5 h-[18px] w-[18px] shrink-0", compact ? "text-go" : "text-muted-foreground")}
            />
            <p>
              <strong className="font-bold">{name}</strong> {text}
            </p>
          </li>
        ))}
      </ul>
      {compact ? (
        <div className="mt-5 animate-stamp rounded-lg border-2 border-go bg-go-soft px-4 py-3 text-go">
          <p className="flex items-center gap-2 font-bold">
            <CheckCircledIcon aria-hidden className="h-5 w-5 shrink-0" />
            Signed by {compact.signedBy}
          </p>
          <p className="mt-0.5 pl-7 text-sm">
            {new Date(compact.signedAt).toLocaleString([], {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>
        </div>
      ) : (
        <>
          <Button
            id="compact-sign"
            size="lg"
            className={cn(
              "mt-5 h-11 w-full px-4 text-base",
              next && "bg-signal font-bold text-signal-foreground hover:bg-signal/90",
            )}
            disabled={busy}
            onClick={() => {
              setBusy(true);
              setError("");
              sign()
                .catch((err) => setError(errorText(err, "Couldn't sign the Compact. Try again.")))
                .finally(() => setBusy(false));
            }}
          >
            {busy ? (
              <ReloadIcon aria-hidden className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              next && <ArrowRightIcon aria-hidden className="mr-2 h-5 w-5 shrink-0" />
            )}
            <span className="truncate">Sign as {name}</span>
          </Button>
          <p className="mt-2 text-sm text-muted-foreground">Your name and the time are stamped on the Compact.</p>
        </>
      )}
      {error && <InlineError>{error}</InlineError>}
    </Panel>
  );
}

/* ---------- The team map ---------- */

function TeamMap({ data, className }: { data: Overview; className?: string }) {
  const { map, voices, quorum, compact } = data;
  const [peek, setPeek] = useState(false);
  return (
    <Panel
      id="map-title"
      title="Team redesign map"
      description="Team totals only. Groups under 3 people stay hidden."
      stop={{ done: map !== null, lock: true }}
      className={className}
      action={
        <Button
          variant="outline"
          size="sm"
          className="h-9 border-input text-sm"
          aria-expanded={peek}
          aria-controls="peek"
          onClick={() => setPeek(!peek)}
        >
          <EyeNoneIcon aria-hidden className="mr-2 h-4 w-4" />
          Show me who said what
        </Button>
      }
    >
      {peek && (
        <p id="peek" className="mb-4 flex animate-rise gap-2.5 rounded-md bg-muted px-4 py-3 text-[15px] leading-snug">
          <LockClosedIcon aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            <strong>There's no endpoint for that.</strong> ezworkspace only returns team totals and hides any group
            under 3 people, even from admins.
          </span>
        </p>
      )}
      {map ? (
        <OpenMap map={map} plans={data.plansIssued} practice={data.practiceSessions} />
      ) : (
        <div className="hatch grid min-h-[320px] place-items-center rounded-md border border-dashed border-input p-4">
          {/* A sign hung over a closed-off area of the floor plan, not a card. */}
          <div className="w-full max-w-[320px] rounded-lg bg-primary px-5 py-4 text-primary-foreground shadow-[0_8px_20px_-6px_hsl(204_30%_12%/0.45)]">
            <p className="flex items-center gap-2 text-lg font-bold">
              <LockClosedIcon aria-hidden className="h-5 w-5" />
              Sealed
            </p>
            <p className="mt-1 text-sm text-white/75">It opens when both of these are true:</p>
            <ul className="mt-3 space-y-2 text-[15px]">
              <Key ok={voices >= quorum}>
                {voices >= quorum ? `${voices} of ${quorum} workers joined` : `${plural(quorum - voices, "more worker")} must join`}
              </Key>
              <Key ok={compact !== null}>{compact ? "The COO signed the Compact" : "The COO must sign the Compact"}</Key>
            </ul>
          </div>
        </div>
      )}
    </Panel>
  );
}

function Key({ ok, children }: { ok: boolean; children: ReactNode }) {
  const Icon = ok ? CheckCircledIcon : CircleIcon;
  return (
    <li className={cn("flex items-center gap-2", ok ? "font-semibold text-[hsl(150_55%_72%)]" : "text-white")}>
      <Icon aria-hidden className="h-[18px] w-[18px] shrink-0" />
      <span>
        <span className="sr-only">{ok ? "Done: " : "Missing: "}</span>
        {children}
      </span>
    </li>
  );
}

function OpenMap({
  map,
  plans,
  practice,
}: {
  map: NonNullable<Overview["map"]>;
  plans: number | null;
  practice: number | null;
}) {
  const facts = [
    `${plural(map.originators, "person", "people")} credited for shortcuts`,
    plans !== null && `${plural(plans, "transition plan")} sent`,
    practice !== null && plural(practice, "practice session"),
  ].filter(Boolean);
  return (
    <div className="animate-rise">
      <p className="flex flex-wrap items-baseline gap-x-2">
        <span className="text-3xl font-bold tabular-nums tracking-[-0.02em]">{hours(map.hoursPerWeek)}</span>
        <span className="font-semibold">hours a week returned to the team</span>
      </p>
      <table className="mt-3 w-full text-[15px]">
        <thead>
          <tr className="border-b text-left text-sm text-muted-foreground">
            <th scope="col" className="py-2 pr-2 font-semibold">Work</th>
            <th scope="col" className="px-2 py-2 text-right font-semibold">Hrs/week</th>
            <th scope="col" className="px-2 py-2 text-right font-semibold">People</th>
            <th scope="col" className="py-2 pl-2 text-right font-semibold">Keep human</th>
          </tr>
        </thead>
        <tbody className="tabular-nums">
          {map.categories.map((c) => (
            <tr key={c.category} className="border-b last:border-b-0">
              <th scope="row" className="py-1.5 pr-2 text-left font-semibold">{c.category}</th>
              <td className="px-2 py-1.5 text-right">{hours(c.hoursPerWeek)}</td>
              <td className="px-2 py-1.5 text-right">{c.contributors}</td>
              <td className="py-1.5 pl-2 text-right">{c.keepHuman}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {map.hiddenCategories > 0 && (
        <p className="mt-2 flex items-center gap-2 text-[15px] text-muted-foreground">
          <EyeNoneIcon aria-hidden className="h-4 w-4 shrink-0" />
          {plural(map.hiddenCategories, "small group")} hidden (under 3 people)
        </p>
      )}
      {map.keepList.length > 0 && (
        <>
          <h3 className="mt-3 text-[15px] font-bold">Keep List: work the team keeps human</h3>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {map.keepList.map((task) => (
              <li key={task} className="rounded-md border border-go/30 bg-go-soft px-2.5 py-1 text-sm font-semibold text-go">
                {task}
              </li>
            ))}
          </ul>
        </>
      )}
      <p className="mt-3 border-t pt-3 text-[15px]">
        {facts.map((fact, i) => (
          // Lines break only between facts, never inside one.
          <span key={i}>
            {i > 0 && " · "}
            <span className="whitespace-nowrap">{fact}</span>
          </span>
        ))}
      </p>
      {NEBULA_URL && (
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1">
          <Button asChild className="h-10">
            <a href={NEBULA_URL} target="_blank" rel="noopener noreferrer">
              Run the redesign in Nebula
              <ExternalLinkIcon aria-hidden className="ml-2 h-4 w-4" />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          </Button>
          <p className="text-sm text-muted-foreground">The worker approves every agent draft.</p>
        </div>
      )}
    </div>
  );
}

/* ---------- Payout order ---------- */

const BAR: Record<Payout["steps"][number]["kind"], string> = {
  workers: "bg-go",
  fee: "bg-input",
  // Neutral, so green (workers) is the only saturated bar: the eye lands on who is paid first.
  company: "bg-input",
};

function PayoutPanel({ payout, company, className }: { payout: Overview["payout"]; company: string; className?: string }) {
  const steps = payout?.steps ?? [
    { order: 1, kind: "workers" as const, label: "Workers who surfaced the savings (30%)", amount: 0 },
    { order: 2, kind: "fee" as const, label: "ezworkspace fee (10% on top of the dividend)", amount: 0 },
    { order: 3, kind: "company" as const, label: `${company} keeps the rest`, amount: 0 },
  ];
  const total = steps.reduce((sum, s) => sum + s.amount, 0) || 1;
  return (
    <Panel
      id="payout-title"
      title="Who gets paid first"
      description={
        payout ? (
          <>
            <span className="font-semibold text-foreground">{usd.format(payout.quarterlySavings)}</span> in measured AI
            savings this quarter
          </>
        ) : (
          "Amounts appear when the map opens."
        )
      }
      className={className}
    >
      <ol className="space-y-3.5">
        {steps.map((s, i) => (
          <li key={s.order}>
            <div className="flex items-start justify-between gap-3">
              <p className="flex gap-2 text-[15px] font-semibold leading-snug">
                <span
                  aria-hidden
                  className="mt-px grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground"
                >
                  {s.order}
                </span>
                <span>
                  <span className="sr-only">Paid {["first", "second", "third"][i]}: </span>
                  {s.label}
                </span>
              </p>
              {payout ? (
                <span
                  className={cn(
                    "animate-rise font-bold tabular-nums leading-tight",
                    s.kind === "workers" ? "text-2xl text-go" : "text-lg",
                  )}
                  style={{ animationDelay: `${i * 450 + 300}ms` }}
                >
                  {usd.format(s.amount)}
                </span>
              ) : (
                <span className="text-sm text-muted-foreground">Sealed</span>
              )}
            </div>
            <div className={cn("ml-7 mt-1.5 h-2.5 overflow-hidden rounded-full", payout ? "bg-muted" : "hatch bg-muted/50")}>
              {payout && (
                // Staggered so the workers' bar always lands first.
                <div
                  className={cn("h-full min-w-1 origin-left animate-grow-x rounded-full", BAR[s.kind])}
                  style={{ width: `${(s.amount / total) * 100}%`, animationDelay: `${i * 450}ms` }}
                />
              )}
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-4 border-t pt-3 text-base font-bold">We don't get paid until they do.</p>
    </Panel>
  );
}

/* ---------- Public registry ---------- */

function Registry({ className }: { className?: string }) {
  const check = useAction(api.registry.check);
  const rows = useQuery(api.registry.list);
  const [company, setCompany] = useState("Acme Insurance");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <Panel
      id="registry-title"
      title="Public registry"
      description="Firecrawl searches public WARN notices and layoff news for every company that signs."
      className={className}
    >
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          check({ company })
            .catch((err) => setError(errorText(err, "Couldn't run the check. Try again.")))
            .finally(() => setBusy(false));
        }}
      >
        <div className="min-w-[200px] flex-1">
          <label htmlFor="registry-company" className="text-sm font-semibold">
            Company
          </label>
          <Input
            id="registry-company"
            required
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className="mt-1 h-10 border-input text-base"
          />
        </div>
        <Button type="submit" disabled={busy} className="h-10 min-w-[136px]">
          {busy ? (
            <>
              <ReloadIcon aria-hidden className="mr-2 h-4 w-4 animate-spin" />
              Checking…
            </>
          ) : (
            "Check public news"
          )}
        </Button>
      </form>
      {error && <InlineError>{error}</InlineError>}
      {rows && rows.length > 0 ? (
        <ul className="mt-4 divide-y border-t">
          {rows.map((r) => (
            <li key={r._id} className="flex flex-wrap items-start gap-x-4 gap-y-1 py-3">
              <div className="min-w-[180px] flex-1">
                <p className="font-bold">{r.company}</p>
                <p className="text-sm text-muted-foreground">
                  Checked{" "}
                  {new Date(r.checkedAt).toLocaleString([], {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
                {r.evidence.length > 0 && (
                  <ul className="mt-1.5 space-y-1">
                    {r.evidence.map((ev) => (
                      <li key={ev.url}>
                        <a
                          href={ev.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-start gap-1.5 text-sm underline hover:no-underline"
                        >
                          <ExternalLinkIcon aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          {ev.title || ev.url}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {r.status === "clear" ? (
                <span className="inline-flex items-center gap-1.5 rounded-md bg-go-soft px-2.5 py-1 text-sm font-bold text-go">
                  <CheckCircledIcon aria-hidden className="h-4 w-4" />
                  Clear
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-md bg-warn-soft px-2.5 py-1 text-sm font-bold text-warn">
                  <ExclamationTriangleIcon aria-hidden className="h-4 w-4" />
                  Pending review
                </span>
              )}
            </li>
          ))}
        </ul>
      ) : (
        rows && <p className="mt-4 text-sm text-muted-foreground">No checks yet. Run one to add {company || "a company"}.</p>
      )}
      <p className="mt-3 text-sm text-muted-foreground">
        A match never removes anything on its own. A person reviews every hit first.
      </p>
    </Panel>
  );
}

/* ---------- Invite ---------- */

function Invite({ className }: { className?: string }) {
  const invite = useMutation(api.team.invite);
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  return (
    <Panel
      id="invite-title"
      title="Invite a teammate"
      description="We text them an invite. Their answers stay private."
      className={className}
    >
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const to = phone.trim();
          invite({ phone: to }).then(
            () => {
              setStatus({ ok: true, text: `Invite queued for ${to}.` });
              setPhone("");
            },
            (err) => setStatus({ ok: false, text: errorText(err, "Couldn't queue that invite. Try again.") }),
          );
        }}
      >
        <div className="min-w-[160px] flex-1">
          <label htmlFor="invite-phone" className="text-sm font-semibold">
            Mobile number
          </label>
          <Input
            id="invite-phone"
            type="tel"
            autoComplete="tel"
            required
            placeholder="+1 415 555 0123"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-1 h-10 border-input text-base"
          />
        </div>
        <Button type="submit" variant="outline" className="h-10 border-input">
          Send invite
        </Button>
      </form>
      <p role="status" className={cn("mt-2 min-h-5 text-sm", status?.ok ? "text-go" : "text-destructive")}>
        {status?.text}
      </p>
    </Panel>
  );
}

function InlineError({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="mt-2 flex items-start gap-1.5 text-sm font-semibold text-destructive">
      <ExclamationTriangleIcon aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
      {children}
    </p>
  );
}

function ResetDemo({ className }: { className?: string }) {
  const reset = useMutation(api.seed.reset);
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(t);
  }, [armed]);
  return (
    <Button
      variant={armed ? "destructive" : "ghost"}
      size="sm"
      className={cn("h-9", !armed && "text-muted-foreground", className)}
      onBlur={() => setArmed(false)}
      onClick={() => {
        setArmed(!armed);
        if (armed) void reset();
      }}
    >
      {armed ? "Click again to reset all demo data" : "Reset demo"}
    </Button>
  );
}
