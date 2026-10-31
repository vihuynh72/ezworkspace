import { DonePlate } from "@/components/route";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ArrowLeftIcon,
  ChatBubbleIcon,
  CheckCircledIcon,
  CheckIcon,
  Cross2Icon,
  DesktopIcon,
  ExclamationTriangleIcon,
  ExternalLinkIcon,
  LockClosedIcon,
  PaperPlaneIcon,
  QuestionMarkCircledIcon,
  SpeakerLoudIcon,
  SpeakerOffIcon,
  StopIcon,
} from "@radix-ui/react-icons";
import { useAction, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { useEffect, useRef, useState } from "react";
import { api } from "../../convex/_generated/api";
import {
  DockButton,
  EmployeeBand,
  MicIcon,
  Recognizer,
  deviceIdOnce,
  failure,
  load,
  micError,
  newId,
  save,
  useVoice,
  type Recognition,
} from "./chat";
import { IMessageCard } from "./imessage-card";

type Sop = FunctionReturnType<typeof api.sops.list>[number];
type Mine = FunctionReturnType<typeof api.training.mine>[number];
type Line = { id: string; role: "me" | "coach"; body: string };
type CaptureControllerLike = { setFocusBehavior(behavior: "no-focus-change"): void };

// Screen sharing is desktop only; phones train by voice and text.
const canShare = !!navigator.mediaDevices?.getDisplayMedia;
const STUCK = "I'm stuck, can you explain this step?";

/** #/train: the employee picks a published training and the coach walks them through it, one step at a time. */
export function Train() {
  const [deviceId] = useState(deviceIdOnce);
  const sops = useQuery(api.sops.list, {});
  const mine = useQuery(api.training.mine, { deviceId });
  const [openId, setOpenId] = useState<Sop["_id"] | null>(null);
  const published = sops?.filter((s) => s.published) ?? [];
  const sop = published.find((s) => s._id === openId);
  const status = new Map((mine ?? []).map((t) => [t.sopId, t]));
  const done = published.filter((s) => status.get(s._id)?.done).length;
  const going = published.filter((s) => status.has(s._id) && !status.get(s._id)?.done).length;
  return (
    <div className="flex h-[100dvh] flex-col bg-background">
      <EmployeeBand active="#/train" />
      {sop ? (
        <Session
          key={sop._id}
          sop={sop}
          deviceId={deviceId}
          start={status.get(sop._id)}
          next={published.find((s) => s._id !== sop._id && !status.get(s._id)?.done)}
          onOpen={setOpenId}
          onExit={() => setOpenId(null)}
        />
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <main className="mx-auto max-w-[960px] px-4 py-8 sm:px-8 sm:py-10">
            <h1 className="text-[2.25rem] font-bold leading-tight tracking-[-0.02em]">{done || going ? "Welcome back" : "Training"}</h1>
            {published.length > 0 && mine !== undefined && (
              <p className="mt-2 text-lg font-semibold">
                {done || going
                  ? `You've finished ${done} of ${published.length} ${published.length === 1 ? "training" : "trainings"}${going ? `, and ${going} ${going === 1 ? "is" : "are"} in progress.` : "."}`
                  : `${published.length} ${published.length === 1 ? "training is" : "trainings are"} ready for you. Each step takes about a minute.`}
              </p>
            )}
            <p className="mt-1 max-w-[60ch] text-lg text-muted-foreground">
              Learn your team's way of working, one step at a time. It's for your growth, not to replace you.
            </p>
            {sops === undefined ? (
              <p className="mt-6 text-muted-foreground">Loading trainings…</p>
            ) : published.length === 0 ? (
              <section className="mt-6 rounded-lg border bg-card p-5">
                <h2 className="text-lg font-bold">No training yet</h2>
                <p className="mt-1">When your employer publishes one, it shows up here.</p>
              </section>
            ) : (
              <ul className="mt-6 grid gap-3">
                {published.map((s) => {
                  const t = status.get(s._id);
                  const verb = t?.done ? "Review" : t ? "Continue" : "Start";
                  return (
                    <li
                      key={s._id}
                      className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4 rounded-lg border bg-card p-5 shadow-[0_1px_2px_rgb(0_0_0/0.05)] transition-shadow duration-150 hover:shadow-[0_6px_18px_-8px_rgb(0_0_0/0.18)] sm:p-6"
                    >
                      <div className="min-w-0 flex-1 basis-[28ch]">
                        <h2 className="text-xl font-bold leading-snug">{s.title}</h2>
                        <p className="mt-1 text-foreground/75">{s.summary}</p>
                        <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm font-semibold tabular-nums">
                          <Status t={t} />
                          <span className="text-muted-foreground">
                            {s.steps.length} steps · about {s.steps.length} min
                          </span>
                        </p>
                      </div>
                      <Button
                        aria-label={`${verb} ${s.title}`}
                        variant={t?.done ? "outline" : "default"}
                        className={cn(
                          "h-12 px-7 text-base font-bold",
                          t?.done ? "border-input bg-card" : "bg-signal text-signal-foreground hover:bg-signal/90",
                        )}
                        onClick={() => setOpenId(s._id)}
                      >
                        {verb}
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="mt-8">
              <IMessageCard />
            </div>
          </main>
        </div>
      )}
    </div>
  );
}

function Status({ t }: { t?: Mine }) {
  if (t?.done)
    return (
      <span className="inline-flex h-7 items-center gap-1 rounded-full bg-go px-3 text-white">
        <CheckIcon aria-hidden className="h-4 w-4" />
        Done
      </span>
    );
  if (t) return <span className="inline-flex h-7 items-center rounded-full bg-signal px-3 text-signal-foreground">Step {t.step} of {t.total}</span>;
  return <span className="inline-flex h-7 items-center rounded-full bg-muted px-3">Not started</span>;
}

function Session({
  sop,
  deviceId,
  start,
  next,
  onOpen,
  onExit,
}: {
  sop: Sop;
  deviceId: string;
  start?: Mine;
  next?: Sop;
  onOpen: (id: Sop["_id"]) => void;
  onExit: () => void;
}) {
  const say = useAction(api.training.say);
  const [lines, setLines] = useState<Line[]>([]);
  // Seeded from the saved progress, so the right step shows before the coach answers.
  const [at, setAt] = useState<{ step: number; total: number; done: boolean } | null>(() =>
    start ? { step: start.step, total: start.total, done: start.done } : null,
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState("");
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState("");
  const [sharing, setSharing] = useState(false);
  const [readAloud, setReadAloud] = useState(() => load("ezw.readAloud") !== "off");
  const voice = useVoice(deviceId, setError);
  const busy = useRef(false); // a ref, so a mic that ends late can't send alongside a button tap
  const started = useRef(false);
  const rec = useRef<Recognition | null>(null);
  const screen = useRef<{ stream: MediaStream; video: HTMLVideoElement } | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  // shown: the employee's own bubble; message: what the coach gets. No message on the first call starts or resumes.
  async function ask(shown?: string, message?: string, frameBase64?: string) {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError("");
    if (shown) setLines((l) => [...l, { id: newId(), role: "me", body: shown }]);
    try {
      const r = await say({ deviceId, sopId: sop._id, ...(message ? { message } : {}), ...(frameBase64 ? { frameBase64 } : {}) });
      const line: Line = { id: newId(), role: "coach", body: r.reply };
      setLines((l) => [...l, line]);
      setAt({ step: r.step, total: r.total, done: r.done });
      if (readAloud) void voice.play(line);
    } catch (e) {
      setError(failure(e, "Couldn't reach the coach. Check your connection and try again."));
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  function stopSharing() {
    screen.current?.stream.getTracks().forEach((t) => t.stop());
    screen.current = null;
    setSharing(false);
  }

  function hush() {
    const r = rec.current;
    rec.current = null; // detached first, so its end event sends nothing
    r?.abort();
    setListening(false);
    setHeard("");
  }

  useEffect(() => {
    if (!started.current) {
      started.current = true; // StrictMode runs effects twice; the coach should greet once
      void ask();
    }
    return () => {
      hush();
      stopSharing();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Only the conversation box scrolls to its newest line; the step card stays where it is.
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines.length, pending]);

  function tap(shown: string, message: string) {
    hush();
    voice.stop();
    voice.unlock(); // inside the tap, so iOS lets the reply play after the network wait
    void ask(shown, message);
  }

  // One frame per tap, never a recording. The frame goes to the coach and is not stored.
  async function grabFrame() {
    let s = screen.current;
    if (!s || !s.stream.active) {
      const Controller = (window as unknown as { CaptureController?: new () => CaptureControllerLike }).CaptureController;
      const controller = Controller ? new Controller() : undefined;
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
        ...(controller ? { controller } : {}),
      } as DisplayMediaStreamOptions);
      try {
        controller?.setFocusBehavior("no-focus-change"); // Chrome: stay here, so the answer is in view
      } catch {
        /* too late or unsupported: the browser switches to the shared tab */
      }
      const video = document.createElement("video");
      video.muted = true;
      video.srcObject = stream;
      await video.play();
      // The browser's own "Stop sharing" ends the track; the next tap asks again.
      stream.getVideoTracks()[0]?.addEventListener("ended", () => {
        if (screen.current?.stream !== stream) return;
        screen.current = null;
        setSharing(false);
      });
      s = screen.current = { stream, video };
      setSharing(true);
    }
    const { video } = s;
    if (!video.videoWidth) throw new Error("no frame yet");
    const scale = Math.min(1, 1280 / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext("2d")!.drawImage(video, 0, 0, canvas.width, canvas.height);
    const url = canvas.toDataURL("image/jpeg", 0.7);
    return url.slice(url.indexOf(",") + 1);
  }

  async function checkScreen() {
    if (busy.current) return;
    hush();
    voice.stop();
    let frame: string;
    try {
      frame = await grabFrame();
    } catch (e) {
      const cancelled = e instanceof DOMException && e.name === "NotAllowedError";
      setError(cancelled ? "Screen sharing was cancelled. Tap again when you're ready." : "I couldn't see your screen. Try again.");
      return;
    }
    await ask("Check my screen", undefined, frame);
  }

  function listen() {
    if (rec.current) return rec.current.stop(); // second tap: done talking, send what was heard
    if (!Recognizer || busy.current) return;
    voice.stop(); // never transcribe the coach's own voice
    voice.unlock();
    const r = new Recognizer();
    let said = "";
    r.lang = "en-US";
    r.interimResults = true;
    r.onresult = (e) => {
      said = Array.from(e.results, (x) => x[0].transcript).join("");
      setHeard(said);
    };
    r.onerror = (e) => {
      said = "";
      if (e.error !== "aborted") setError(micError(e.error));
    };
    r.onend = () => {
      if (rec.current !== r) return; // hushed, or a newer session took over
      rec.current = null;
      setListening(false);
      setHeard("");
      const text = said.trim().slice(0, 500);
      if (text) void ask(text, text);
    };
    try {
      r.start();
      rec.current = r;
      setListening(true);
      setError("");
    } catch {
      setError(micError(""));
    }
  }

  const total = at?.total ?? sop.steps.length;
  const finished = at?.done ? total : Math.max(0, (at?.step ?? 1) - 1);
  const current = at?.done ? total + 1 : (at?.step ?? 0); // 0 while starting: nothing is current yet
  const step = at && !at.done ? sop.steps[at.step - 1] : undefined;
  const latest = [...lines].reverse().find((l) => l.role === "coach");

  const outline = (
    <ol className="grid gap-1">
      {sop.steps.map((s, i) => {
        const n = i + 1;
        const now = n === current;
        const past = n < current;
        return (
          <li
            key={i}
            aria-current={now ? "step" : undefined}
            className={cn(
              "flex items-start gap-3 rounded-md px-2 py-2 leading-snug",
              now && "bg-signal/30 font-bold",
              !now && !past && "text-muted-foreground",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 text-xs font-bold tabular-nums",
                past ? "border-go bg-go text-white" : now ? "border-primary bg-signal text-signal-foreground" : "border-input bg-card",
              )}
            >
              {past ? <CheckIcon className="h-3.5 w-3.5" /> : n}
            </span>
            <span className="pt-px">
              {s.title}
              <span className="sr-only">{past ? " (done)" : now ? " (you are here)" : ""}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );

  return (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
      <div className="mx-auto max-w-[1200px] px-4 pb-12 pt-4 sm:px-8">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" className="-ml-3 h-10 px-3 text-base font-semibold" onClick={onExit}>
            <ArrowLeftIcon aria-hidden className="h-4 w-4" />
            All trainings
          </Button>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" className="h-10 border-input bg-card px-3 text-sm">
              <a href="/acme/index.html" target="_blank" rel="noopener">
                <ExternalLinkIcon aria-hidden className="h-4 w-4" />
                Practice app
              </a>
            </Button>
            {/* Already the side window: nothing to pop out. */}
            {window.name !== "ezw-coach" && (
              <Button
                variant="outline"
                className="h-10 border-input bg-card px-3 text-sm"
                onClick={() => window.open("#/train", "ezw-coach", "width=440,height=780")}
              >
                <ExternalLinkIcon aria-hidden className="h-4 w-4" />
                Pop out coach
              </Button>
            )}
            <Button asChild variant="outline" className="h-10 border-input bg-card px-3 text-sm">
              <a href="#/home" aria-label="Exit to the home page">
                <Cross2Icon aria-hidden className="h-4 w-4" />
                Exit
              </a>
            </Button>
          </div>
        </div>

        <h1 className="mt-3 text-[1.75rem] font-bold leading-tight tracking-[-0.02em] sm:text-[2.25rem]">{sop.title}</h1>
        <div className="mt-3 flex max-w-[560px] items-center gap-3">
          <div
            role="progressbar"
            aria-label="Training progress"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={finished}
            className="h-3 flex-1 overflow-hidden rounded-full bg-muted"
          >
            <div
              className="h-full rounded-full bg-go transition-[width] duration-700"
              style={{ width: `${total ? (finished / total) * 100 : 0}%` }}
            />
          </div>
          <p className="shrink-0 text-sm font-semibold tabular-nums">
            {!at ? "Starting…" : at.done ? `All ${total} steps done` : `Step ${at.step} of ${at.total}`}
          </p>
        </div>

        {/* Phones: the whole SOP folds away above the step; desktop keeps it in the left column. */}
        <details className="mt-4 rounded-lg border bg-card lg:hidden">
          <summary className="min-h-11 cursor-pointer px-4 py-2.5 font-semibold">
            All {total} steps · about {total} min
          </summary>
          <div className="px-2 pb-2">{outline}</div>
        </details>

        <div className="mt-6 grid items-start gap-8 lg:grid-cols-[minmax(240px,300px)_minmax(0,1fr)]">
          <aside aria-labelledby="steps-title" className="hidden lg:sticky lg:top-4 lg:block">
            <h2 id="steps-title" className="px-2 font-bold">
              {total} steps · about {total} min
            </h2>
            <div className="mt-2">{outline}</div>
          </aside>

          <div className="grid min-w-0 gap-5">
            {at?.done ? (
              <section aria-labelledby="learned-title" className="animate-rise rounded-xl border border-go bg-go-soft p-5 sm:p-6">
                <DonePlate>Skill earned: {sop.title}</DonePlate>
                <h2 id="learned-title" className="mt-5 text-xl font-bold">
                  What you learned
                </h2>
                <ol className="mt-2 grid gap-1.5">
                  {sop.steps.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 leading-snug">
                      <CheckIcon aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-go" />
                      {s.title}
                    </li>
                  ))}
                </ol>
                <p className="mt-4">It's on your progress page now.</p>
                <div className="mt-5 flex flex-wrap gap-3">
                  {next ? (
                    <Button
                      className="h-12 bg-signal px-6 text-base font-bold text-signal-foreground hover:bg-signal/90"
                      onClick={() => onOpen(next._id)}
                    >
                      Next training
                    </Button>
                  ) : (
                    <Button className="h-12 px-6 text-base font-bold" onClick={onExit}>
                      All trainings
                    </Button>
                  )}
                  <Button asChild variant="outline" className="h-12 border-input bg-card px-6 text-base">
                    <a href="#/me">My progress</a>
                  </Button>
                </div>
                {next && <p className="mt-3 text-sm text-foreground/75">Up next: {next.title}</p>}
              </section>
            ) : (
              <section aria-labelledby="step-title" className="rounded-xl border bg-card p-5 shadow-[0_1px_2px_rgb(0_0_0/0.05)] sm:p-6">
                {step ? (
                  <>
                    <div className="flex items-start gap-4">
                      <span
                        aria-hidden
                        className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-signal text-lg font-bold tabular-nums text-signal-foreground"
                      >
                        {at?.step}
                      </span>
                      <h2 id="step-title" className="pt-1.5 text-[1.5rem] font-bold leading-tight tracking-[-0.01em]">
                        <span className="sr-only">Step {at?.step}: </span>
                        {step.title}
                      </h2>
                    </div>
                    <h3 className="mt-5 font-bold">What to do</h3>
                    <p className="mt-1 max-w-[65ch] text-lg leading-relaxed">{step.detail}</p>
                    <div className="mt-4 rounded-lg bg-go-soft p-4">
                      <h3 className="flex items-center gap-2 font-bold text-go">
                        <CheckCircledIcon aria-hidden className="h-5 w-5 shrink-0" />
                        How you'll know it's done
                      </h3>
                      <p className="mt-1 max-w-[65ch]">{step.check}</p>
                    </div>
                  </>
                ) : (
                  <h2 id="step-title" className="text-xl font-bold text-muted-foreground">
                    Getting your first step…
                  </h2>
                )}

                {/* The coach's latest answer sits right above the buttons, so every tap shows its result here. */}
                <div aria-live="polite" className="mt-5 flex items-start gap-3">
                  <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
                    <ChatBubbleIcon className="h-4 w-4" />
                  </span>
                  {pending ? (
                    <div className="flex items-center gap-1 rounded-[20px] rounded-tl-md bg-muted px-4 py-3.5">
                      <span className="sr-only">The coach is typing</span>
                      {[0, 150, 300].map((delay) => (
                        <span
                          key={delay}
                          aria-hidden
                          className="h-2 w-2 animate-typing rounded-full bg-muted-foreground"
                          style={{ animationDelay: `${delay}ms` }}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="min-w-0 whitespace-pre-wrap break-words rounded-[20px] rounded-tl-md bg-muted px-4 py-2.5 text-[17px] leading-snug">
                      <span className="sr-only">Coach: </span>
                      {latest?.body ?? "Hi! I'm your coach. Tap a button below when you're ready."}
                    </p>
                  )}
                </div>

                <div className="mt-6 border-t pt-5">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Button
                      className="h-14 bg-signal text-lg font-bold text-signal-foreground hover:bg-signal/90"
                      disabled={pending}
                      onClick={() => tap("I did it", "done")}
                    >
                      <CheckIcon aria-hidden className="h-5 w-5" />
                      I did it
                    </Button>
                    <Button variant="outline" className="h-14 border-input text-lg" disabled={pending} onClick={() => tap(STUCK, STUCK)}>
                      <QuestionMarkCircledIcon aria-hidden className="h-5 w-5" />
                      I'm stuck
                    </Button>
                  </div>

                  <p
                    className={cn(
                      "mx-auto mt-4 line-clamp-2 min-h-[1.375em] max-w-[40ch] text-center text-[17px] leading-snug",
                      heard ? "font-semibold" : "text-muted-foreground",
                    )}
                  >
                    {heard || (listening ? "Listening…" : pending ? "One moment…" : Recognizer ? "Tap the mic and ask anything." : "Ask below, or use a button.")}
                  </p>
                  <div className="mx-auto mt-2 grid max-w-[420px] grid-cols-[1fr_auto_1fr] items-center justify-items-center">
                    {canShare ? (
                      <DockButton label="Check my screen" disabled={pending} onClick={() => void checkScreen()}>
                        <DesktopIcon aria-hidden className="h-5 w-5" />
                      </DockButton>
                    ) : (
                      <span />
                    )}
                    {Recognizer ? (
                      <button
                        type="button"
                        aria-label="Talk"
                        aria-pressed={listening}
                        disabled={pending && !listening}
                        onClick={listen}
                        className="relative grid h-[72px] w-[72px] place-items-center rounded-full bg-primary text-primary-foreground transition-transform duration-150 ease-out-expo active:scale-95 disabled:opacity-50"
                      >
                        {listening && <span aria-hidden className="absolute inset-0 animate-ping rounded-full bg-primary/25" />}
                        {listening ? <StopIcon aria-hidden className="relative h-7 w-7" /> : <MicIcon className="relative h-8 w-8" />}
                      </button>
                    ) : (
                      <span />
                    )}
                    <DockButton
                      label="Read aloud"
                      pressed={readAloud}
                      onClick={() => {
                        const next = !readAloud;
                        setReadAloud(next);
                        save("ezw.readAloud", next ? "on" : "off");
                        if (!next) voice.stop();
                      }}
                    >
                      {readAloud ? <SpeakerLoudIcon aria-hidden className="h-5 w-5" /> : <SpeakerOffIcon aria-hidden className="h-5 w-5" />}
                    </DockButton>
                  </div>

                  <form
                    className="mt-4 flex gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const text = draft.trim();
                      if (!text || busy.current) return;
                      setDraft("");
                      tap(text, text);
                    }}
                  >
                    <label htmlFor="train-input" className="sr-only">
                      Ask the coach
                    </label>
                    <input
                      id="train-input"
                      maxLength={500}
                      enterKeyHint="send"
                      autoComplete="off"
                      placeholder="Or type a question"
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      className="h-11 min-w-0 flex-1 rounded-md border border-input bg-card px-3 text-base placeholder:text-muted-foreground"
                    />
                    <Button type="submit" aria-label="Send" className="h-11 w-11 shrink-0 p-0" disabled={pending || !draft.trim()}>
                      <PaperPlaneIcon aria-hidden className="h-5 w-5" />
                    </Button>
                  </form>
                  {error && (
                    <p role="alert" className="mt-2 flex items-start gap-1.5 text-sm font-semibold text-destructive">
                      <ExclamationTriangleIcon aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
                      {error}
                    </p>
                  )}
                  {canShare && (
                    <p className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <LockClosedIcon aria-hidden className="h-3.5 w-3.5 shrink-0" />
                        The AI looks only when you tap. Nothing is saved.
                      </span>
                      {sharing && (
                        <button type="button" onClick={stopSharing} className="font-semibold text-foreground underline underline-offset-4">
                          Stop sharing
                        </button>
                      )}
                    </p>
                  )}
                </div>
              </section>
            )}

            {lines.length > 0 && (
              <section aria-labelledby="talk-title" className="rounded-xl border bg-card">
                <h2 id="talk-title" className="border-b px-4 py-3 font-bold">
                  Conversation
                </h2>
                <div ref={logRef} className="flex max-h-[360px] flex-col gap-2 overflow-y-auto overscroll-contain px-4 pb-4 pt-2">
                  {lines.map((m) =>
                    m.role === "me" ? (
                      <p
                        key={m.id}
                        className="mt-2 max-w-[85%] self-end whitespace-pre-wrap break-words rounded-[20px] rounded-br-md bg-primary px-4 py-2.5 text-[17px] leading-snug text-primary-foreground sm:text-base"
                      >
                        <span className="sr-only">You: </span>
                        {m.body}
                      </p>
                    ) : (
                      <p
                        key={m.id}
                        className="mt-2 max-w-[85%] self-start whitespace-pre-wrap break-words rounded-[20px] rounded-bl-md bg-muted px-4 py-2.5 text-[17px] leading-snug sm:text-base"
                      >
                        <span className="sr-only">Coach: </span>
                        {m.body}
                      </p>
                    ),
                  )}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
