import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Mic } from "./teach";

export const clock = (ms: number) =>
  `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, "0")}`;

type Action = { at: number; text: string };

const APP = "/acme/index.html";

// What a person would call a control. A labelled landmark is a container, not something you click.
const CONTROL =
  "a, button, summary, [role=button], [role=link], [role=tab], [role=menuitem], [role=option], [role=checkbox], " +
  "[role=radio], [role=switch], input[type=checkbox], input[type=radio], input[type=submit], input[type=button], " +
  "[aria-label]:not(nav, main, header, footer, aside, section, form, table, ul, ol, dialog, [role=dialog], " +
  "[role=region], [role=navigation], [role=group], [role=toolbar], [role=list])";

// A box people type in or pick from. Checkboxes and buttons are logged as clicks instead.
const isField = (el: Element) =>
  /^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName) &&
  !/^(checkbox|radio|submit|button|reset|image)$/.test((el as HTMLInputElement).type);

const tidy = (s: string | null | undefined) => (s ?? "").replace(/\s+/g, " ").trim().slice(0, 80);

/** The name a person sees on a control. For a field that is its label, never what was typed into it. */
function nameOf(el: Element) {
  const f = el as HTMLInputElement;
  const by = el.getAttribute("aria-labelledby");
  const field = /^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName);
  return tidy(
    el.getAttribute("aria-label") ||
      (by && el.ownerDocument.getElementById(by)?.textContent) ||
      f.labels?.[0]?.textContent ||
      (field ? (/^(submit|button|reset)$/.test(f.type) ? f.value : f.placeholder || f.name) : el.textContent) ||
      el.getAttribute("title"),
  );
}

const pageName = (doc: Document) =>
  tidy(
    (doc.querySelector("main h1") ?? doc.querySelector("h1"))?.textContent ||
      doc.title ||
      doc.location.hash.replace(/^#\/?/, ""),
  );

/** Records clicks and field names inside the company app, so the employer never records their own device. */
export function Recorder({
  mic,
  disabled,
  status,
  onWrite,
  onRecording,
}: {
  mic: Mic;
  disabled: boolean;
  status: ReactNode;
  onWrite: (text: string) => void;
  onRecording: (on: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const [since, setSince] = useState<number | null>(null);
  const [actions, setActions] = useState<Action[]>([]);
  const [said, setSaid] = useState("");
  const [error, setError] = useState("");
  const frame = useRef<HTMLIFrameElement>(null);
  const list = useRef<HTMLOListElement>(null);
  const detach = useRef<(() => void) | null>(null);
  useEffect(() => () => detach.current?.(), []);
  useEffect(() => {
    if (list.current) list.current.scrollTop = list.current.scrollHeight;
  }, [actions]);
  const recording = since !== null;

  function log(text: string, t0: number) {
    const at = Date.now() - t0;
    setActions((all) => {
      const last = all[all.length - 1];
      // Clicking a label also clicks its checkbox; one step is enough.
      return last && last.text === text && at - last.at < 1000 ? all : [...all, { at, text }];
    });
  }

  // A new page is a new document, so this runs again after every load inside the frame.
  function attach(t0: number) {
    detach.current?.();
    detach.current = null;
    const doc = frame.current?.contentDocument;
    const win = frame.current?.contentWindow;
    if (!doc || !win) {
      setError(
        "This page is outside your company app, so it can't be recorded here. Go back in the app, or use Record your screen, Upload a video or Paste a link below.",
      );
      return false;
    }
    const onClick = (e: Event) => {
      const el = (e.target as Element | null)?.closest?.(CONTROL);
      if (!el || isField(el)) return;
      const name = nameOf(el);
      const box = el as HTMLInputElement;
      if (name) log(`${box.type === "checkbox" ? (box.checked ? "Ticked" : "Unticked") : "Clicked"} "${name}"`, t0);
    };
    const onChange = (e: Event) => {
      const el = e.target as HTMLSelectElement;
      if (!isField(el)) return;
      const name = nameOf(el);
      // A dropdown choice is a label the app offers, like a button. What someone types is theirs and is never read.
      const choice = el.tagName === "SELECT" ? tidy(el.selectedOptions[0]?.textContent) : "";
      if (name) log(choice ? `Chose "${choice}" in "${name}"` : `Filled "${name}"`, t0);
    };
    // Wait for the app to draw the new page before reading its heading.
    const onHash = () =>
      setTimeout(() => {
        const page = pageName(doc);
        if (page) log(`Opened ${page}`, t0);
      }, 300);
    doc.addEventListener("click", onClick, true);
    doc.addEventListener("change", onChange, true);
    win.addEventListener("hashchange", onHash);
    detach.current = () => {
      doc.removeEventListener("click", onClick, true);
      doc.removeEventListener("change", onChange, true);
      win.removeEventListener("hashchange", onHash);
    };
    setError("");
    const page = pageName(doc);
    if (page) log(`Opened ${page}`, t0);
    return true;
  }

  function start() {
    const t0 = Date.now();
    setActions([]);
    setSaid("");
    if (!attach(t0)) return;
    setSince(t0);
    onRecording(true);
  }

  function stop() {
    detach.current?.();
    detach.current = null;
    mic.stop();
    setSince(null);
    onRecording(false);
  }

  function send() {
    if (!actions.length) return setError("Nothing was recorded yet. Click through the task in the app first.");
    const steps = actions.map((a, i) => `${i + 1}. ${a.text}`).join("\n");
    const words = said.trim();
    onWrite(`Recorded actions in the company app:\n${steps}${words ? `\n\nWhat the employer said:\n${words}` : ""}`);
  }

  if (!open) {
    return (
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Button
          size="lg"
          className="bg-signal font-bold text-signal-foreground hover:bg-signal/90"
          onClick={() => setOpen(true)}
        >
          Open the company app
        </Button>
        <p className="text-sm text-muted-foreground">Nothing to install. Nothing records your own computer.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <iframe
        ref={frame}
        src={APP}
        title="Your company app"
        onLoad={() => {
          if (since !== null) attach(since);
        }}
        className={cn(
          "h-[70vh] min-h-[28rem] w-full rounded-md border bg-white",
          recording && "ring-2 ring-destructive ring-offset-2",
        )}
      />
      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <p role="status" className="flex items-center gap-2 font-bold">
            {recording ? (
              <>
                <span aria-hidden className="h-2.5 w-2.5 animate-pulse rounded-full bg-destructive" />
                Recording · {actions.length} {actions.length === 1 ? "step" : "steps"}
              </>
            ) : (
              "Ready to record"
            )}
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (recording) stop();
              setOpen(false);
            }}
          >
            Close
          </Button>
        </div>

        {recording ? (
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => {
                stop();
                send();
              }}
            >
              Stop and write the SOP
            </Button>
            <Button
              variant="outline"
              aria-pressed={mic.listening}
              onClick={() => (mic.listening ? mic.stop() : mic.start(said, setSaid))}
            >
              {mic.listening ? "Stop talking" : "Talk it through"}
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button
              className="bg-signal font-bold text-signal-foreground hover:bg-signal/90"
              disabled={disabled}
              onClick={start}
            >
              {actions.length ? "Record again" : "Start recording"}
            </Button>
            {actions.length > 0 && (
              <Button variant="outline" disabled={disabled} onClick={send}>
                Write the SOP
              </Button>
            )}
          </div>
        )}

        <p className="text-sm text-muted-foreground">
          {recording ? "Do the task in the app. Each click becomes a step." : "Press Start, then do the task in the app."}
        </p>

        <ol ref={list} aria-label="Recorded steps" className="max-h-80 divide-y overflow-y-auto border-y">
          {actions.length === 0 ? (
            <li className="py-3 text-muted-foreground">Steps show up here as you click.</li>
          ) : (
            actions.map((a, i) => (
              <li key={i} className="flex gap-3 py-2">
                <span className="w-10 shrink-0 text-sm tabular-nums text-muted-foreground">{clock(a.at)}</span>
                <span className="min-w-0 break-words">{a.text}</span>
              </li>
            ))
          )}
        </ol>

        {(said || (recording && mic.listening)) && (
          <p className="rounded-md bg-muted p-3 text-sm">{said || "Talk as you click. Your words show here."}</p>
        )}

        <div className="flex items-start justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            Only your clicks and field names are recorded. What you type stays private.
          </p>
          <Button
            variant="ghost"
            size="sm"
            disabled={!actions.length && !said}
            onClick={() => {
              if (recording) mic.stop();
              setActions([]);
              setSaid("");
              setError("");
            }}
          >
            Clear
          </Button>
        </div>

        {error ? <p className="text-destructive">{error}</p> : status}
      </div>
    </div>
  );
}
