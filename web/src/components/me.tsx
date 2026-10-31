import { DonePlate, SignBand } from "@/components/route";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowRightIcon, CheckIcon, LockClosedIcon, ReloadIcon } from "@radix-ui/react-icons";
import { useAction, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { api } from "../../convex/_generated/api";

// The same private id the chat stores. Never created here: no id means they haven't chatted yet.
function storedDeviceId() {
  try {
    return localStorage.getItem("ezw.deviceId");
  } catch {
    return null;
  }
}

/** #/me: the worker's own dashboard. Only they see it; the employer gets team totals only. */
export function Me() {
  const [deviceId] = useState(storedDeviceId);
  const data = useQuery(api.progress.dashboard, deviceId ? { deviceId } : "skip");
  return (
    <div className="min-h-[100dvh] bg-background">
      <SignBand>
        <a href="#/text" className="ml-auto text-sm font-semibold underline underline-offset-4">
          Back to chat
        </a>
      </SignBand>
      <main className="mx-auto max-w-[960px] px-4 py-6 sm:px-8">
        <h1 className="text-[1.875rem] font-bold leading-tight tracking-[-0.02em]">My workspace</h1>
        <p className="mt-1 flex items-center gap-1.5 text-muted-foreground">
          <LockClosedIcon aria-hidden className="h-4 w-4 shrink-0" />
          Only you see this page. Your company sees team totals only.
        </p>
        {deviceId && data === undefined ? (
          <p className="mt-6 text-muted-foreground">Loading your workspace…</p>
        ) : !deviceId || !data ? (
          <Panel title="Nothing here yet" className="mt-6">
            <p>Start in the chat. Tell the coach one task that eats your time.</p>
            <Button asChild className="mt-4 h-11">
              <a href="#/text">Start in the chat</a>
            </Button>
          </Panel>
        ) : (
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <LevelCard data={data} />
            <Panel title="What to learn next">
              <p className="text-[15px] text-foreground/75">Your team's own workflows and SOPs you haven't practiced yet.</p>
              {data.gaps.length === 0 ? (
                <p className="mt-3">You know every team workflow so far. Nice work.</p>
              ) : (
                <ul className="mt-3 divide-y border-y">
                  {data.gaps.map((g, i) => (
                    <li key={`${g.kind}:${g.title}`} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3">
                      <div className="min-w-0">
                        <p className="font-semibold leading-snug">{g.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {g.kind === "sop" ? "Team SOP" : `Team workflow · ${g.category}`}
                        </p>
                      </div>
                      <Button
                        asChild
                        variant={i === 0 ? "default" : "outline"}
                        className={cn("h-10", i === 0 && "bg-signal font-bold text-signal-foreground hover:bg-signal/90", i > 0 && "border-input")}
                      >
                        <a href="#/text">
                          {i === 0 && <ArrowRightIcon aria-hidden className="h-4 w-4" />}
                          Practice now
                        </a>
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
            <Suggestions deviceId={deviceId} className="lg:col-span-2" />
          </div>
        )}
      </main>
    </div>
  );
}

type Data = NonNullable<FunctionReturnType<typeof api.progress.dashboard>>;

function LevelCard({ data }: { data: Data }) {
  const into = data.xp - (data.nextLevelXp - 100);
  const finished = data.step > data.steps;
  return (
    <Panel title={`Level ${data.level}`} className="lg:row-span-1">
      <div className="flex items-center justify-between gap-3 text-sm font-semibold tabular-nums">
        <span>{data.xp} XP</span>
        <span className="text-muted-foreground">{data.nextLevelXp - data.xp} XP to level {data.level + 1}</span>
      </div>
      <div
        role="progressbar"
        aria-label="XP to next level"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={into}
        className="mt-2 h-3 overflow-hidden rounded-full bg-muted"
      >
        <div className="h-full rounded-full bg-go transition-[width] duration-700" style={{ width: `${into}%` }} />
      </div>
      <dl className="mt-5 grid grid-cols-2 gap-4">
        <div>
          <dt className="text-sm text-muted-foreground">Hours back each week</dt>
          <dd className="text-[1.875rem] font-bold leading-tight tabular-nums">{data.hoursPerWeek}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">Your path</dt>
          <dd className="text-[1.875rem] font-bold leading-tight tabular-nums">
            {finished ? "Done" : `Step ${data.step} of ${data.steps}`}
          </dd>
        </div>
      </dl>
      {data.onTrack && (
        <div className="mt-4">
          <DonePlate>On track</DonePlate>
        </div>
      )}
      <h3 className="mt-5 text-sm font-semibold">Badges</h3>
      <ul className="mt-2 flex flex-wrap gap-2">
        {data.badges.map((b) => (
          <li
            key={b.name}
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold",
              b.earned ? "border-go bg-go-soft text-go" : "border-dashed border-input text-muted-foreground",
            )}
          >
            {b.earned ? <CheckIcon aria-hidden className="h-4 w-4" /> : <LockClosedIcon aria-hidden className="h-3.5 w-3.5" />}
            {b.name}
            <span className="sr-only">{b.earned ? "(earned)" : "(not yet)"}</span>
          </li>
        ))}
      </ul>
      {data.skills.length > 0 && (
        <p className="mt-4 text-[15px] text-foreground/75">Skills: {data.skills.join(", ")}</p>
      )}
    </Panel>
  );
}

function Suggestions({ deviceId, className }: { deviceId: string; className?: string }) {
  const suggest = useAction(api.progress.suggest);
  const [items, setItems] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const load = useCallback(async () => {
    setBusy(true);
    setError(false);
    try {
      setItems(await suggest({ deviceId }));
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }, [suggest, deviceId]);
  useEffect(() => void load(), [load]);
  return (
    <Panel
      title="Suggestions for you"
      className={className}
      action={
        <Button variant="outline" className="h-10 border-input" onClick={() => void load()} disabled={busy}>
          <ReloadIcon aria-hidden className={cn("h-4 w-4", busy && "animate-spin")} />
          {busy ? "Thinking…" : "New ideas"}
        </Button>
      }
    >
      <p className="text-[15px] text-foreground/75">Small changes that fit how your team works.</p>
      {error && <p className="mt-3 text-sm text-destructive">Couldn't get ideas right now. Try again.</p>}
      {items === null ? (
        !error && <p className="mt-3 text-muted-foreground">Finding ideas for you…</p>
      ) : (
        <ul aria-busy={busy} className="mt-3 grid gap-2">
          {items.map((s) => (
            <li key={s} className="flex gap-2 rounded-md bg-muted px-4 py-3">
              <ArrowRightIcon aria-hidden className="mt-1 h-4 w-4 shrink-0 text-go" />
              {s}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function Panel({ title, action, className, children }: { title: string; action?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <section className={cn("rounded-lg border bg-card p-5", className)}>
      <div className="mb-1 flex min-h-9 items-center justify-between gap-3">
        <h2 className="text-lg font-bold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
