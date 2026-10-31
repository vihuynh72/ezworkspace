import { Connector } from "@/components/route";
import { cn } from "@/lib/utils";
import { CheckIcon, DesktopIcon, PauseIcon, PlayIcon, SpeakerLoudIcon } from "@radix-ui/react-icons";
import { useEffect, useState, type CSSProperties } from "react";

const STOPS = ["Show it once", "AI writes the SOP", "AI trains everyone"];
const HOLD_MS = [5200, 5600, 7400];
const SOP = [
  "Put the invoice on hold.",
  "Compare the invoice price with the PO.",
  "Check what was received against the order.",
  "If the gap is over $50, email the vendor both prices.",
  "Note the reason on the invoice.",
  "Release it when the corrected invoice arrives.",
];
const WAVE = [35, 60, 45, 85, 60, 100, 40, 75, 55, 90, 45, 70, 85, 35, 60, 50, 30, 45, 65, 40];

/** Per-element delay for the `.lp-*` sequence classes in index.css. */
const at = (s: number) => ({ "--d": `${s}s` }) as CSSProperties;

/** The living product visual: record in the app, AI writes the SOP, the worker is trained. Loops; stops on reduced motion. */
export function LiveDemo() {
  const [tick, setTick] = useState(0);
  const [playing, setPlaying] = useState(() => !window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const stage = tick % 3;

  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(() => setTick((n) => n + 1), HOLD_MS[stage]);
    return () => clearTimeout(t);
  }, [playing, tick, stage]);

  // Jump forward to the next pass of stop i, so a click always replays it.
  const show = (i: number) => {
    setPlaying(false);
    setTick((n) => n + ((i - (n % 3) + 3) % 3 || 3));
  };

  return (
    <figure className="overflow-hidden rounded-lg bg-background text-foreground shadow-[0_40px_80px_-40px_rgb(0_0_0/0.85)] ring-1 ring-white/10">
      <figcaption className="sr-only">
        A manager records an invoice task inside the company app, the AI writes it up as six SOP steps, and an employee is
        trained on it by iMessage and by a voice coach on the web.
      </figcaption>
      <div className="flex items-center gap-2 border-b bg-card px-3 py-2.5 sm:gap-3 sm:px-4">
        <ol className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2">
          {STOPS.map((label, i) => (
            <li key={label} className={cn("flex min-w-0 items-center gap-1.5 sm:gap-2", i > 0 && "flex-1")}>
              {i > 0 && <Connector done={i <= stage} className="min-w-2" />}
              <button
                type="button"
                onClick={() => show(i)}
                aria-current={i === stage ? "step" : undefined}
                className={cn(
                  "flex min-w-0 items-center gap-2 rounded-md py-1 pl-1 pr-2 text-xs font-bold transition-colors duration-500 sm:text-sm",
                  i === stage ? "bg-signal text-signal-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs transition-colors duration-500",
                    i === stage ? "bg-primary text-signal" : i < stage ? "bg-go text-white" : "border-2 border-input",
                  )}
                >
                  {i < stage ? <CheckIcon /> : i + 1}
                </span>
                <span className={cn("truncate", i !== stage && "sr-only sm:not-sr-only")}>{label}</span>
              </button>
            </li>
          ))}
        </ol>
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          aria-label={playing ? "Pause the demo" : "Play the demo"}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-md border text-foreground hover:bg-muted"
        >
          {playing ? <PauseIcon aria-hidden /> : <PlayIcon aria-hidden />}
        </button>
      </div>
      <div className="grid">
        {[RecordScene, SopScene, TrainScene].map((Scene, i) => (
          <div
            key={i}
            aria-hidden
            className={cn(
              "[grid-area:1/1] transition-[opacity,filter,transform] duration-700 ease-out-expo",
              i === stage ? "opacity-100" : "pointer-events-none scale-[0.985] opacity-0 blur-[3px]",
            )}
          >
            {/* Remount only when this scene becomes active, so its sequence replays and never resets mid-fade. */}
            <Scene key={Math.floor((tick - i) / 3)} />
          </div>
        ))}
      </div>
    </figure>
  );
}

function RecordScene() {
  return (
    <div className="flex h-full flex-col gap-3 p-4 sm:p-6">
      <div className="overflow-hidden rounded-lg border bg-card shadow-[0_10px_24px_-14px_rgb(0_0_0/0.35)]">
        <div className="flex items-center gap-2 border-b bg-muted px-3 py-2 text-sm">
          <span className="font-bold">Acme</span>
          <span className="truncate text-muted-foreground">Invoices / INV-2041</span>
          <span className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-full bg-destructive px-2.5 py-0.5 text-xs font-bold text-white">
            <span className="lp-rec h-2 w-2 rounded-full bg-white" />
            Recording in ezworkspace
          </span>
        </div>
        <div className="p-4 sm:p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-lg font-bold">Brightline Supply</p>
            <span className="lp-in rounded-sm bg-warn-soft px-2 py-0.5 text-xs font-bold text-warn" style={at(0.3)}>
              Price doesn't match PO
            </span>
          </div>
          <dl className="mt-3 grid grid-cols-[1fr_auto] gap-y-1.5 tabular-nums">
            <dt className="text-muted-foreground">Invoice total</dt>
            <dd className="font-bold">$4,812.00</dd>
            <dt className="text-muted-foreground">Purchase order</dt>
            <dd>$4,320.00</dd>
          </dl>
          <div className="mt-5 flex items-center gap-2">
            <span className="rounded-md border px-3 py-1.5 text-sm font-semibold">Approve</span>
            <span className="lp-press relative rounded-md bg-primary px-4 py-1.5 text-sm font-bold text-primary-foreground">
              Hold
              <Cursor className="lp-cursor absolute left-[62%] top-[58%] h-6 w-6" />
            </span>
            <span className="lp-in ml-auto inline-flex items-center gap-1 text-sm font-bold text-go" style={at(2.5)}>
              <CheckIcon /> On hold
            </span>
          </div>
        </div>
      </div>
      <p className="lp-in flex gap-2.5 rounded-lg bg-primary p-3 text-[0.9375rem] leading-snug text-primary-foreground" style={at(1)}>
        <SpeakerLoudIcon className="mt-0.5 h-4 w-4 shrink-0 text-signal" />
        <span>
          <b>Dana, AP lead:</b> "If the price doesn't match the PO, put it on hold first. Then..."
        </span>
      </p>
      <p className="mt-auto flex items-center gap-2 text-sm font-semibold text-muted-foreground">
        <DesktopIcon className="shrink-0" /> Recorded inside the app. Nothing to install.
      </p>
    </div>
  );
}

function SopScene() {
  return (
    <div className="p-4 sm:p-6">
      <div className="rounded-lg border bg-card p-4 shadow-[0_10px_24px_-14px_rgb(0_0_0/0.35)] sm:p-5">
        <p className="text-lg font-bold leading-tight">Handle an invoice price mismatch</p>
        <p className="mt-1 text-sm text-muted-foreground">Written by AI from Dana's recording</p>
        <ol className="mt-4 space-y-2.5">
          {SOP.map((step, i) => (
            <li key={step} className="lp-in flex gap-3" style={at(0.3 + i * 0.5)}>
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {i + 1}
              </span>
              <span className="lp-write block text-[0.9375rem] leading-6" style={at(0.3 + i * 0.5)}>
                {step}
              </span>
            </li>
          ))}
        </ol>
        <div className="lp-in mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-3" style={at(3.6)}>
          <span className="text-sm text-muted-foreground">You check it, then publish.</span>
          <span className="rounded-md bg-signal px-3 py-1.5 text-sm font-bold text-signal-foreground">Publish to AP team</span>
        </div>
      </div>
    </div>
  );
}

function TrainScene() {
  return (
    <div className="flex min-h-[25rem] flex-col items-start gap-4 p-4 sm:flex-row sm:p-6">
      <div className="w-[196px] shrink-0 rounded-[32px] bg-[#111518] p-[6px] shadow-[0_18px_40px_-18px_rgb(0_0_0/0.6)] sm:w-[220px]">
        <div className="overflow-hidden rounded-[26px] bg-white">
          <div className="flex flex-col items-center gap-1 border-b border-[#e3e3e8] bg-[#f6f6f7] pb-2 pt-2.5">
            <span className="h-4 w-14 rounded-full bg-[#111518]" />
            <span className="mt-1 grid h-8 w-8 place-items-center rounded-full bg-primary text-xs font-bold text-signal">ez</span>
            <span className="text-xs font-semibold">ezworkspace</span>
          </div>
          <div className="flex min-h-[17rem] flex-col gap-1.5 px-2 py-3 text-xs leading-[1.3]">
            <Bubble d={0.3}>New training: Handle an invoice price mismatch. Reply START</Bubble>
            <Bubble d={1.5} me>
              START
            </Bubble>
            <div className="grid">
              <span className="lp-blip flex w-fit gap-1 rounded-[16px] bg-[#e9e9eb] px-3 py-2.5 [grid-area:1/1]" style={at(2.1)}>
                {[0, 0.15, 0.3].map((s) => (
                  <i key={s} className="h-1.5 w-1.5 animate-typing rounded-full bg-[#6b6b70]" style={{ animationDelay: `${s}s` }} />
                ))}
              </span>
              <Bubble d={3.1} className="[grid-area:1/1]">
                Step 1 of 6: Put the invoice on hold. Open it in Acme and press Hold. Reply DONE when it's on hold.
              </Bubble>
            </div>
          </div>
        </div>
      </div>
      <div
        className="lp-in w-full max-w-[17rem] rounded-lg border bg-card p-4 shadow-[0_18px_40px_-16px_rgb(0_0_0/0.45)] sm:mt-10 sm:flex-1"
        style={at(3.8)}
      >
        <div className="flex items-center justify-between gap-2 text-xs font-bold text-muted-foreground">
          <span>Web coach</span>
          <span>Step 1 of 6</span>
        </div>
        <div className="mt-2 grid grid-cols-6 gap-1">
          {SOP.map((s, i) => (
            <span key={s} className={cn("h-1 rounded-full", i === 0 ? "bg-signal" : "bg-border")} />
          ))}
        </div>
        <p className="mt-3 font-bold leading-snug">Put the invoice on hold.</p>
        <div className="lp-wave mt-3 flex h-8 items-center gap-[3px]">
          {WAVE.map((h, i) => (
            <i key={i} className="block w-[3px] rounded-full bg-primary" style={{ height: `${h}%`, ...at((i % 7) * 0.09) }} />
          ))}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Coach is talking you through it</p>
        <span className="mt-3 flex items-center justify-center gap-2 rounded-md border-2 border-foreground px-3 py-1.5 text-sm font-bold">
          <DesktopIcon /> Check my screen
        </span>
      </div>
    </div>
  );
}

function Bubble({ children, d, me, className }: { children: string; d: number; me?: boolean; className?: string }) {
  return (
    <span
      className={cn(
        "lp-in block w-fit max-w-[86%] rounded-[16px] px-2.5 py-1.5",
        me ? "self-end bg-[#0a6fe0] text-white" : "bg-[#e9e9eb] text-[#111]",
        className,
      )}
      style={at(d)}
    >
      {children}
    </span>
  );
}

function Cursor({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path d="M4 2.5 19.5 13l-7 1.2L9 21z" fill="#111518" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}
