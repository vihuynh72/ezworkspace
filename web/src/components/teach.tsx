import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { UserButton } from "@clerk/clerk-react";
import { useAction, useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { api } from "../../convex/_generated/api";
import { errorText } from "./dashboard";
import { SignBand } from "./route";

type Source = "voice" | "text" | "screen" | "video" | "link";
type Step = { title: string; detail: string; check: string };
type Draft = { title: string; summary: string; steps: Step[]; source: Source };
type Sop = FunctionReturnType<typeof api.sops.list>[number];

const MAX_FRAMES = 8;
const MAX_MS = 2 * 60 * 1000;

// Web Speech is prefixed in Chrome and Safari and missing in Firefox; without it, people type.
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
};
const speech = window as unknown as Record<"SpeechRecognition" | "webkitSpeechRecognition", (new () => Recognition) | undefined>;
const Recognizer = speech.SpeechRecognition ?? speech.webkitSpeechRecognition;

const join = (a: string, b: string) => [a.trim(), b.trim()].filter(Boolean).join(" ");
const clock = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, "0")}`;

// Frames go to the model as base64 JPEG without the data: prefix, at most 1280px and 300 KB each.
function grab(source: CanvasImageSource, width: number, height: number) {
  const scale = Math.min(1, 1280 / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  canvas.getContext("2d")!.drawImage(source, 0, 0, canvas.width, canvas.height);
  let data = "";
  for (const quality of [0.7, 0.5, 0.35]) {
    data = canvas.toDataURL("image/jpeg", quality).split(",")[1];
    if (data.length <= 300_000) break;
  }
  return data;
}

// At most 8 frames, evenly spaced, always keeping the first and the last.
const spread = (frames: string[]) =>
  frames.length <= MAX_FRAMES
    ? frames
    : Array.from({ length: MAX_FRAMES }, (_, i) => frames[Math.round((i * (frames.length - 1)) / (MAX_FRAMES - 1))]);

async function sampleVideo(file: File) {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.src = url;
  try {
    await new Promise((ok, fail) => {
      video.onloadeddata = ok;
      video.onerror = fail;
    });
    if (!video.videoWidth) throw new Error("no picture");
    // Some recordings report an endless duration; then the first frame is all we can take.
    const count = Number.isFinite(video.duration) ? MAX_FRAMES : 1;
    const frames: string[] = [];
    for (let i = 0; i < count; i++) {
      if (count > 1) {
        await new Promise((ok) => {
          video.onseeked = ok;
          video.currentTime = (video.duration * (i + 0.5)) / count;
        });
      }
      frames.push(grab(video, video.videoWidth, video.videoHeight));
    }
    return frames;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Live dictation that keeps listening through pauses until stop(). */
function useMic() {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");
  const rec = useRef<Recognition | null>(null);
  const keep = useRef(false);
  useEffect(
    () => () => {
      keep.current = false;
      rec.current?.abort();
    },
    [],
  );

  function start(base: string, onText: (text: string) => void) {
    if (!Recognizer) return setError("Voice works in Chrome, Edge and Safari. You can type instead.");
    let said = base;
    const run = () => {
      const r = new Recognizer();
      r.lang = navigator.language || "en-US";
      r.continuous = true;
      r.interimResults = true;
      let heard = "";
      r.onresult = (e) => {
        heard = Array.from(e.results, (x) => x[0].transcript).join(" ");
        onText(join(said, heard));
      };
      r.onerror = (e) => {
        if (e.error === "no-speech" || e.error === "aborted") return;
        keep.current = false;
        setError(
          e.error.endsWith("not-allowed")
            ? "Your browser blocked the mic. Allow it, or type instead."
            : "The mic stopped working. You can type instead.",
        );
      };
      // Chrome ends a session after a pause; start a new one until the person taps stop.
      r.onend = () => {
        said = join(said, heard);
        if (keep.current) run();
        else setListening(false);
      };
      rec.current = r;
      try {
        r.start();
      } catch {
        keep.current = false;
        setListening(false);
      }
    };
    keep.current = true;
    setError("");
    setListening(true);
    run();
  }

  function stop() {
    keep.current = false;
    rec.current?.stop();
  }

  return { listening, error, start, stop };
}

export function Teach() {
  const draftSop = useAction(api.sops.draft);
  const sops = useQuery(api.sops.list);
  const mic = useMic();

  const [text, setText] = useState("");
  const [spoke, setSpoke] = useState(false);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [since, setSince] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [narration, setNarration] = useState("");
  const stopScreen = useRef<((send?: boolean) => void) | null>(null);
  useEffect(() => () => stopScreen.current?.(false), []);

  async function write(args: { source: Source; text?: string; frames?: string[]; url?: string }) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      setDraft({ ...(await draftSop(args)), source: args.source });
      requestAnimationFrame(() => document.getElementById("draft")?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } catch (e) {
      setError(errorText(e, "The AI couldn't write that one. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  // practice: open the practice invoice first, so it's in the share picker. Same tick as the picker call, before any await.
  async function recordScreen(practice = false) {
    setError("");
    setNotice("");
    if (practice) window.open("/demo-invoice.html", "_blank");
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
    } catch {
      return setError(
        practice
          ? "The practice invoice is open in a new tab. Press Start recording and pick that tab."
          : "Screen sharing was stopped or blocked. Try again, or upload a video.",
      );
    }
    const video = document.createElement("video");
    video.muted = true;
    video.srcObject = stream;
    await video.play();
    const frames: string[] = [];
    let said = "";
    const snap = () => {
      if (video.videoWidth) frames.push(grab(video, video.videoWidth, video.videoHeight));
    };
    const shots = setInterval(snap, 3000);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    const limit = setTimeout(() => stopScreen.current?.(), MAX_MS);
    stopScreen.current = (send = true) => {
      stopScreen.current = null;
      clearInterval(shots);
      clearInterval(tick);
      clearTimeout(limit);
      stream.getTracks().forEach((t) => t.stop());
      mic.stop();
      setSince(null);
      if (!send) return;
      if (frames.length === 0) return setError("Nothing was captured. Please try again.");
      void write({ source: "screen", frames: spread(frames), text: said || undefined });
    };
    // The browser's own "Stop sharing" button ends the recording too.
    stream.getVideoTracks()[0].onended = () => stopScreen.current?.();
    snap();
    setSince(Date.now());
    setNow(Date.now());
    setNarration("");
    mic.start("", (t) => {
      said = t;
      setNarration(t);
    });
  }

  async function upload(file: File) {
    setBusy(true);
    setError("");
    setNotice("");
    let frames: string[];
    try {
      frames = await sampleVideo(file);
    } catch {
      setBusy(false);
      return setError("That video won't open here. Try an MP4 or WebM file.");
    }
    await write({ source: "video", frames });
  }

  const recording = since !== null;
  const locked = busy || recording;
  const shownError = error || mic.error;

  return (
    <div className="min-h-screen">
      <SignBand>
        <p className="hidden min-w-0 truncate border-l border-white/25 pl-4 text-white/80 sm:block">Teach the AI</p>
        <div className="ml-auto flex items-center gap-4">
          <a href="#/train" className="whitespace-nowrap font-semibold underline-offset-4 hover:underline">
            Open employee view
          </a>
          <UserButton />
        </div>
      </SignBand>
      <main className="mx-auto grid max-w-[1200px] gap-10 px-4 py-10 sm:px-8">
        <div>
          <h1 className="text-[2.25rem] font-bold leading-tight tracking-[-0.025em] sm:text-[3rem]">
            Show the AI a task, once.
          </h1>
          <p className="mt-2 max-w-[60ch] text-lg text-muted-foreground">
            Pick one way below. The AI writes the SOP. You check it, then publish it to every employee.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Tile title="Describe it" hint="Talk or type, the way you'd explain it to a new hire.">
            <Textarea
              aria-label="Describe the task"
              rows={5}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="When an invoice price doesn't match the PO, put it on hold..."
              disabled={busy}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                aria-pressed={mic.listening && !recording}
                disabled={locked}
                onClick={() => {
                  if (mic.listening) return mic.stop();
                  setSpoke(true);
                  mic.start(text, setText);
                }}
              >
                {mic.listening ? "Stop talking" : "Talk"}
              </Button>
              <Button
                disabled={locked || !text.trim()}
                onClick={() => {
                  mic.stop();
                  void write({ source: spoke ? "voice" : "text", text: text.trim() });
                }}
              >
                Write the SOP
              </Button>
            </div>
          </Tile>

          <Tile title="Record your screen" hint="Do the task and talk it through. Up to 2 minutes.">
            {recording ? (
              <>
                <p className="flex items-center gap-2 font-bold" role="status">
                  <span aria-hidden className="h-2.5 w-2.5 animate-pulse rounded-full bg-destructive" />
                  Recording {clock(now - since)} / {clock(MAX_MS)}
                </p>
                <p className="min-h-12 text-muted-foreground">{narration || "Talk as you work. Your words show here."}</p>
                <Button className="self-start" onClick={() => stopScreen.current?.()}>
                  Stop and write the SOP
                </Button>
              </>
            ) : (
              <>
              <div className="flex flex-wrap gap-2">
                <Button
                  className="bg-signal font-bold text-signal-foreground hover:bg-signal/90"
                  disabled={busy || mic.listening || !navigator.mediaDevices?.getDisplayMedia}
                  onClick={() => void recordScreen(true)}
                >
                  Record a task
                </Button>
                <Button
                  variant="outline"
                  className="border-input"
                  disabled={busy || mic.listening || !navigator.mediaDevices?.getDisplayMedia}
                  onClick={() => void recordScreen()}
                >
                  Start recording
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Record a task opens a practice invoice in a new tab. Pick that tab, then work and talk.
              </p>
              </>
            )}
          </Tile>

          <Tile title="Upload a video" hint="A screen recording or a phone video of the task.">
            <Input
              type="file"
              accept="video/*"
              aria-label="Choose a video"
              disabled={locked}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void upload(file);
              }}
            />
          </Tile>

          <Tile title="Paste a link" hint="An SOP, help article or doc your team already uses.">
            <form
              className="flex flex-wrap gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const link = url.trim();
                void write({ source: "link", url: /^https?:\/\//i.test(link) ? link : `https://${link}` });
              }}
            >
              <Input
                aria-label="Link to a doc"
                inputMode="url"
                placeholder="https://..."
                className="min-w-0 flex-1"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={locked}
              />
              <Button type="submit" disabled={locked || !url.trim()}>
                Write the SOP
              </Button>
            </form>
          </Tile>
        </div>

        <div aria-live="polite">
          {busy ? (
            <p className="text-lg font-bold">Writing your SOP...</p>
          ) : shownError ? (
            <p className="text-destructive">{shownError}</p>
          ) : notice ? (
            <p className="text-lg font-bold text-go">{notice}</p>
          ) : null}
        </div>

        {draft && (
          <DraftEditor
            draft={draft}
            setDraft={setDraft}
            done={(message) => {
              setDraft(null);
              setNotice(message);
            }}
          />
        )}

        <section aria-labelledby="trainings-title">
          <h2 id="trainings-title" className="text-xl font-bold tracking-[-0.01em]">
            Your trainings
          </h2>
          <p className="text-muted-foreground">
            Employees' questions and screens stay private. You see completion totals only.
          </p>
          {sops === undefined ? (
            <p className="mt-3 text-muted-foreground">Loading...</p>
          ) : sops.length === 0 ? (
            <p className="mt-3">Nothing yet. Teach the AI your first task above.</p>
          ) : (
            <ul className="mt-3 divide-y border-y">
              {sops.map((sop) => (
                <Training key={sop._id} sop={sop} />
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}

function Tile({ title, hint, children }: { title: string; hint: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-lg border bg-card p-5 shadow-[0_1px_2px_rgb(0_0_0/0.05)] sm:p-6">
      <div>
        <h2 className="text-xl font-bold leading-snug tracking-[-0.01em]">{title}</h2>
        <p className="mt-1 text-muted-foreground">{hint}</p>
      </div>
      {children}
    </section>
  );
}

function DraftEditor({
  draft,
  setDraft,
  done,
}: {
  draft: Draft;
  setDraft: (draft: Draft) => void;
  done: (message: string) => void;
}) {
  const saveSop = useMutation(api.sops.save);
  const publish = useMutation(api.sops.publish);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const rewrite = useAction(api.sops.rewriteStep);
  const [rewriting, setRewriting] = useState<number | null>(null);
  const edit = (i: number, patch: Partial<Step>) =>
    setDraft({ ...draft, steps: draft.steps.map((s, j) => (j === i ? { ...s, ...patch } : s)) });

  async function clarify(i: number) {
    setRewriting(i);
    setError("");
    try {
      edit(i, await rewrite({ title: draft.title, step: draft.steps[i] }));
    } catch (e) {
      setError(errorText(e, "Couldn't rewrite that step. Try again."));
    } finally {
      setRewriting(null);
    }
  }

  async function keep(andPublish: boolean) {
    const title = draft.title.trim();
    const steps = draft.steps.map((s) => ({ title: s.title.trim(), detail: s.detail.trim(), check: s.check.trim() }));
    if (!title || steps.length === 0 || steps.some((s) => !s.title)) {
      return setError("Add a title for the SOP and for every step.");
    }
    setSaving(true);
    setError("");
    try {
      const id = await saveSop({ title, summary: draft.summary.trim(), steps, source: draft.source });
      // Once saved, never save twice: a failed publish leaves a draft the list can publish.
      const published = andPublish && (await publish({ id }).then(() => true, () => false));
      done(
        published
          ? `Published. Every employee gets a message to start "${title}".`
          : andPublish
            ? "Saved as a draft, but publishing didn't work. Try Publish in the list below."
            : "Saved as a draft. Publish it when you're ready.",
      );
    } catch (e) {
      setError(errorText(e, "Couldn't save. Please try again."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section id="draft" aria-labelledby="draft-title" className="scroll-mt-4 rounded-lg border bg-card p-4 sm:p-6">
      <h2 id="draft-title" className="text-xl font-bold tracking-[-0.01em]">
        Check your SOP
      </h2>
      <p className="text-muted-foreground">The AI wrote this. Fix anything that's off, then publish.</p>
      <div className="mt-4 grid gap-2">
        <Label htmlFor="sop-title">Title</Label>
        <Input id="sop-title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
        <Label htmlFor="sop-summary" className="mt-2">
          Summary
        </Label>
        <Textarea
          id="sop-summary"
          rows={2}
          value={draft.summary}
          onChange={(e) => setDraft({ ...draft, summary: e.target.value })}
        />
      </div>
      <ol className="mt-4">
        {draft.steps.map((s, i) => (
          <li key={i} className="grid gap-2 border-t py-4">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor={`step-${i}`} className="text-base font-bold">
                Step {i + 1}
              </Label>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" disabled={rewriting !== null} onClick={() => void clarify(i)}>
                  {rewriting === i ? "Rewriting…" : "Make it clearer"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={draft.steps.length === 1}
                  onClick={() => setDraft({ ...draft, steps: draft.steps.filter((_, j) => j !== i) })}
                >
                  Remove step
                </Button>
              </div>
            </div>
            <Input id={`step-${i}`} value={s.title} onChange={(e) => edit(i, { title: e.target.value })} />
            <Textarea
              aria-label={`Step ${i + 1}: what to do`}
              placeholder="What to do"
              rows={2}
              value={s.detail}
              onChange={(e) => edit(i, { detail: e.target.value })}
            />
            <Input
              aria-label={`Step ${i + 1}: what to check`}
              placeholder="What to check before moving on"
              value={s.check}
              onChange={(e) => edit(i, { check: e.target.value })}
            />
          </li>
        ))}
      </ol>
      <Button
        variant="outline"
        disabled={draft.steps.length >= 12}
        onClick={() => setDraft({ ...draft, steps: [...draft.steps, { title: "", detail: "", check: "" }] })}
      >
        Add a step
      </Button>
      <div className="mt-6 flex flex-wrap gap-2 border-t pt-4">
        <Button size="lg" disabled={saving} onClick={() => void keep(true)}>
          Save & publish to employees
        </Button>
        <Button size="lg" variant="outline" disabled={saving} onClick={() => void keep(false)}>
          Save as draft
        </Button>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-destructive">
          {error}
        </p>
      )}
    </section>
  );
}

function Training({ sop }: { sop: Sop }) {
  const publish = useMutation(api.sops.publish);
  const remove = useMutation(api.sops.remove);
  const [armed, setArmed] = useState(false);
  const [error, setError] = useState("");
  const run = (p: Promise<unknown>) =>
    void p.then(
      () => setError(""),
      (e) => setError(errorText(e, "That didn't work. Please try again.")),
    );

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 py-4">
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 text-lg font-bold leading-snug">
          {sop.title}
          <span
            className={cn(
              "rounded-md px-2 py-0.5 text-sm font-bold",
              sop.published ? "bg-go-soft text-go" : "bg-warn-soft text-warn",
            )}
          >
            {sop.published ? "Published" : "Draft"}
          </span>
        </p>
        <p className="text-muted-foreground">
          {sop.steps.length} steps <span aria-hidden>·</span> Started {sop.started} <span aria-hidden>·</span> Finished{" "}
          {sop.completed}
        </p>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
      <div className="flex gap-2">
        {!sop.published && (
          <Button size="sm" onClick={() => run(publish({ id: sop._id }))}>
            Publish
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          className={cn(armed && "border-destructive text-destructive")}
          onBlur={() => setArmed(false)}
          onClick={() => (armed ? run(remove({ id: sop._id })) : setArmed(true))}
        >
          {armed ? "Click again to remove" : "Remove"}
        </Button>
      </div>
    </li>
  );
}
