import { DonePlate } from "@/components/route";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ArrowLeftIcon,
  CheckIcon,
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
type Line = { id: string; role: "me" | "coach"; body: string };
type CaptureControllerLike = { setFocusBehavior(behavior: "no-focus-change"): void };

// Screen sharing is desktop only; phones train by voice and text.
const canShare = !!navigator.mediaDevices?.getDisplayMedia;
const STUCK = "I'm stuck, can you explain this step?";

/** #/train: the employee picks a published training and the coach walks them through it, one step at a time. */
export function Train() {
  const [deviceId] = useState(deviceIdOnce);
  const sops = useQuery(api.sops.list, {});
  const [openId, setOpenId] = useState<Sop["_id"] | null>(null);
  const published = sops?.filter((s) => s.published) ?? [];
  const sop = published.find((s) => s._id === openId);
  return (
    <div className={cn("flex h-[100dvh] flex-col", sop ? "bg-card" : "bg-background")}>
      <EmployeeBand active="#/train" />
      {sop ? (
        <Session key={sop._id} sop={sop} deviceId={deviceId} onExit={() => setOpenId(null)} />
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <main className="mx-auto max-w-[960px] px-4 py-8 sm:px-8">
            <h1 className="text-[2.25rem] font-bold leading-tight tracking-[-0.02em]">Training</h1>
            <p className="mt-2 max-w-[60ch] text-lg text-muted-foreground">
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
                {published.map((s) => (
                  <li key={s._id} className="flex flex-wrap items-center justify-between gap-4 rounded-lg border bg-card p-5 shadow-[0_1px_2px_rgb(0_0_0/0.05)] transition-shadow duration-150 hover:shadow-[0_6px_18px_-8px_rgb(0_0_0/0.18)] sm:p-6">
                    <div className="min-w-0 flex-1">
                      <h2 className="text-xl font-bold leading-snug">{s.title}</h2>
                      <p className="mt-1 text-foreground/75">{s.summary}</p>
                      <p className="mt-3 inline-flex h-7 items-center rounded-full bg-muted px-3 text-sm font-semibold tabular-nums">{s.steps.length} steps</p>
                    </div>
                    <Button className="h-12 bg-signal px-7 text-base font-bold text-signal-foreground hover:bg-signal/90" onClick={() => setOpenId(s._id)}>
                      Start
                    </Button>
                  </li>
                ))}
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

function Session({ sop, deviceId, onExit }: { sop: Sop; deviceId: string; onExit: () => void }) {
  const say = useAction(api.training.say);
  const [lines, setLines] = useState<Line[]>([]);
  const [at, setAt] = useState<{ step: number; total: number; done: boolean } | null>(null);
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
  const endRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!lines.length) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    endRef.current?.scrollIntoView({ block: "end", behavior: still ? "auto" : "smooth" });
  }, [lines.length, pending, at?.done]);

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
  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto max-w-[680px] px-4 py-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={onExit}
              className="-ml-1 inline-flex min-h-9 items-center gap-1.5 rounded-md px-1 text-sm font-semibold text-muted-foreground hover:text-foreground"
            >
              <ArrowLeftIcon aria-hidden className="h-4 w-4" />
              All trainings
            </button>
            {/* Already the side window: nothing to pop out. */}
            {window.name !== "ezw-coach" && (
              <Button
                variant="outline"
                className="h-9 border-input px-3 text-sm"
                onClick={() => window.open("#/train", "ezw-coach", "width=440,height=780")}
              >
                <ExternalLinkIcon aria-hidden className="h-4 w-4" />
                Pop out coach
              </Button>
            )}
          </div>
          <h1 className="mt-2 text-[1.75rem] font-bold leading-tight tracking-[-0.02em]">{sop.title}</h1>
          <p className="mt-3 text-sm font-semibold tabular-nums">
            {!at ? "Starting…" : at.done ? `All ${total} steps done` : `Step ${at.step} of ${at.total}`}
          </p>
          <div
            role="progressbar"
            aria-label="Training progress"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={finished}
            className="mt-1.5 h-3 overflow-hidden rounded-full bg-muted"
          >
            <div
              className="h-full rounded-full bg-go transition-[width] duration-700"
              style={{ width: `${total ? (finished / total) * 100 : 0}%` }}
            />
          </div>

          <div role="log" aria-live="polite" aria-label="Training conversation" className="mt-5 flex flex-col gap-2">
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
            {pending && (
              <div className="mt-2 flex items-center gap-1 self-start rounded-[20px] rounded-bl-md bg-muted px-4 py-3.5">
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
            )}
          </div>

          {at?.done && (
            <section className="mt-6 animate-rise rounded-lg border border-go bg-go-soft p-5 text-center">
              <DonePlate>Skill earned: {sop.title}</DonePlate>
              <p className="mt-3">Nice work. It's on your progress page now.</p>
              <div className="mt-4 flex flex-wrap justify-center gap-3">
                <Button asChild className="h-11 px-5">
                  <a href="#/me">See my progress</a>
                </Button>
                <Button variant="outline" className="h-11 border-input bg-card px-5" onClick={onExit}>
                  Back to Training
                </Button>
              </div>
            </section>
          )}
          <div ref={endRef} />
        </div>
      </div>

      {!at?.done && (
        <div className="shrink-0 border-t bg-card pb-[max(env(safe-area-inset-bottom),0.75rem)]">
          <div className="mx-auto max-w-[680px] px-4 pt-3">
            <p
              className={cn(
                "mx-auto line-clamp-2 min-h-[1.375em] max-w-[40ch] text-center text-[17px] leading-snug",
                heard ? "font-semibold" : "text-muted-foreground",
              )}
            >
              {heard || (listening ? "Listening…" : pending ? "One moment…" : Recognizer ? "Tap the mic and ask anything." : "Ask below, or use a button.")}
            </p>
            <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center justify-items-center">
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
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button
                className="h-12 bg-signal text-base font-bold text-signal-foreground hover:bg-signal/90"
                disabled={pending}
                onClick={() => tap("I did it", "done")}
              >
                <CheckIcon aria-hidden className="h-5 w-5" />
                I did it
              </Button>
              <Button variant="outline" className="h-12 border-input text-base" disabled={pending} onClick={() => tap(STUCK, STUCK)}>
                <QuestionMarkCircledIcon aria-hidden className="h-5 w-5" />
                I'm stuck
              </Button>
            </div>
            <form
              className="mt-2 flex gap-2"
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
              <p className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <LockClosedIcon aria-hidden className="h-3.5 w-3.5 shrink-0" />
                  The AI looks only when you tap. Nothing is saved.
                </span>
                <a
                  href="/acme/"
                  target="_blank"
                  rel="noopener"
                  className="font-semibold text-foreground underline underline-offset-4"
                >
                  Open the practice invoice
                </a>
                {sharing && (
                  <button type="button" onClick={stopSharing} className="font-semibold text-foreground underline underline-offset-4">
                    Stop sharing
                  </button>
                )}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
