import { cn } from "@/lib/utils";
import {
  ExclamationTriangleIcon,
  KeyboardIcon,
  LockClosedIcon,
  PaperPlaneIcon,
  ReloadIcon,
  SpeakerLoudIcon,
  SpeakerOffIcon,
  StopIcon,
} from "@radix-ui/react-icons";
import { useAction, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import { api } from "../../convex/_generated/api";

type Msg = { id: string; role: "me" | "coach"; body: string; at: number };
type Saved = { messages: Msg[]; seen: string[]; chatted: boolean };

const WELCOME: Msg[] = [
  "Hi, I'm ezworkspace, a private coach for your work. No AI experience needed.",
  "Will this be used to cut your job? No. Your company sees nothing until 5 coworkers join and it promises no pay cuts or AI layoffs for 12 months. Then it sees team totals only, never your messages.",
  "Tell me one thing you do every week. Or ask me anything.",
].map((body, i) => ({ id: `welcome-${i}`, role: "coach", body, at: 0 }));

// Sent exactly as written: the server understands plain words.
const CHIPS = ["I'm new here", "What can AI do for my job?", "Make me a plan", "Let me practice", "How am I doing?"];
const CHIP =
  "h-9 whitespace-nowrap rounded-full border border-input bg-card px-3.5 text-[15px] font-semibold transition-colors duration-150 hover:bg-muted disabled:opacity-50";

// Same words the server treats as "erase me".
const ERASE = /^\s*(delete|stop|forget me)\s*$/i;
// One silent WAV sample, played inside a tap so iOS lets a voice note play after the network wait.
const SILENT = "data:audio/wav;base64,UklGRiUAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQEAAACA";

// Web Speech is prefixed in Chrome and Safari and missing in Firefox; without it the chat is text only.
type Recognition = {
  lang: string;
  interimResults: boolean;
  onresult: ((e: { results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
};
const speech = window as unknown as Record<"SpeechRecognition" | "webkitSpeechRecognition", (new () => Recognition) | undefined>;
const Recognizer = speech.SpeechRecognition ?? speech.webkitSpeechRecognition;

function micError(code: string) {
  if (code === "no-speech") return "I didn't hear anything. Tap the mic and try again.";
  if (code.endsWith("not-allowed")) return "Your browser blocked the mic. Allow it, or type instead.";
  return "The mic isn't working right now. Type instead.";
}

// Every storage access can throw (private mode, blocked site data); memory keeps the session working.
const memory = new Map<string, string>();
function load(key: string) {
  try {
    const value = localStorage.getItem(key);
    if (value !== null) return value;
  } catch {
    /* fall through to memory */
  }
  return memory.get(key) ?? null;
}
function save(key: string, value: string) {
  memory.set(key, value);
  try {
    localStorage.setItem(key, value);
  } catch {
    /* memory only */
  }
}

function deviceIdOnce() {
  let id = load("ezw.deviceId");
  if (!id) {
    // randomUUID only exists on https or localhost; a phone on plain-http LAN gets the fallback.
    id = crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`;
    save("ezw.deviceId", id);
  }
  return id;
}

function loadChat(): Saved {
  try {
    const saved = JSON.parse(load("ezw.chat.v1") ?? "null") as Partial<Saved> | null;
    if (saved && Array.isArray(saved.messages)) {
      return { messages: saved.messages, seen: saved.seen ?? [], chatted: !!saved.chatted };
    }
  } catch {
    /* unreadable history: start fresh */
  }
  return { messages: [], seen: [], chatted: false };
}

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const failure = (e: unknown, fallback: string) => (e instanceof ConvexError ? String(e.data) : fallback);

export function Chat() {
  const [deviceId] = useState(deviceIdOnce);
  const [chat, setChat] = useState(loadChat);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [armDelete, setArmDelete] = useState(false);
  const [typing, setTyping] = useState(!Recognizer);
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState("");
  const [readAloud, setReadAloud] = useState(() => load("ezw.readAloud") !== "off");
  const sendToCoach = useAction(api.ingest.web);
  const inbox = useQuery(api.outbox.webInbox, { deviceId });
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const rec = useRef<Recognition | null>(null);
  const voice = useVoice(deviceId, setError);

  useEffect(() => save("ezw.chat.v1", JSON.stringify({ ...chat, messages: chat.messages.slice(-100) })), [chat]);
  useEffect(
    () => () => {
      const r = rec.current;
      rec.current = null; // detached first, so its end event sends nothing
      r?.abort();
    },
    [],
  );

  // Pushes (like a new plan step) arrive once each, as incoming bubbles.
  useEffect(() => {
    if (!inbox?.length) return;
    setChat((c) => {
      const fresh = inbox.filter((m) => !c.seen.includes(m._id));
      if (!fresh.length) return c;
      return {
        ...c,
        seen: [...c.seen, ...fresh.map((m) => m._id)],
        messages: [...c.messages, ...fresh.map((m) => ({ id: m._id, role: "coach" as const, body: m.body, at: m.at }))],
      };
    });
  }, [inbox]);

  useEffect(() => {
    if (!chat.messages.length && !pending) return; // first run starts at the top, on the welcome
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    endRef.current?.scrollIntoView({ block: "end", behavior: still ? "auto" : "smooth" });
  }, [chat.messages.length, pending]);

  useEffect(() => {
    if (!armDelete) return;
    const t = setTimeout(() => setArmDelete(false), 4000);
    return () => clearTimeout(t);
  }, [armDelete]);

  useEffect(() => {
    if (draft === "" && inputRef.current) inputRef.current.style.height = "";
  }, [draft]);

  async function send(text: string, spoken = false) {
    const body = text.trim();
    if (!body || pending) return;
    if (body.length > 500) {
      setError("That's a long one. Keep it under 500 characters, or send it in two parts.");
      return;
    }
    const mine: Msg = { id: newId(), role: "me", body, at: Date.now() };
    setChat((c) => ({ ...c, messages: [...c.messages, mine] }));
    setDraft("");
    setError("");
    setPending(true);
    try {
      const reply = await sendToCoach({ deviceId, body });
      const coach: Msg = { id: newId(), role: "coach", body: reply, at: Date.now() };
      // After DELETE the server has forgotten this device, so the local copy goes too.
      setChat((c) =>
        ERASE.test(body)
          ? { messages: [coach], seen: c.seen, chatted: false }
          : { ...c, chatted: true, messages: [...c.messages, coach] },
      );
      if (spoken && readAloud && !ERASE.test(body)) void voice.play(coach);
    } catch (e) {
      setChat((c) => ({ ...c, messages: c.messages.filter((m) => m.id !== mine.id) }));
      setDraft(body);
      setError(failure(e, "Couldn't reach ezworkspace. Check your connection and try again."));
    } finally {
      setPending(false);
    }
  }

  function listen() {
    if (rec.current) return rec.current.stop(); // second tap: done talking, send what was heard
    if (!Recognizer || pending) return;
    voice.stop(); // never transcribe the coach's own voice
    voice.unlock();
    const r = new Recognizer();
    let said = "";
    r.lang = "en-US";
    r.interimResults = true;
    r.onresult = (e) => {
      if (rec.current !== r) return;
      said = Array.from(e.results, (x) => x[0].transcript).join("");
      setHeard(said);
      if (e.results[e.results.length - 1]?.isFinal) {
        void send(said, true);
        said = "";
      }
    };
    r.onerror = (e) => {
      said = "";
      if (e.error === "aborted") return;
      setError(micError(e.error));
      if (e.error !== "no-speech") setTyping(true);
    };
    r.onend = () => {
      if (rec.current !== r) return; // hushed, or a newer session took over
      if (said.trim()) void send(said, true); // Safari can end without marking the last result final
      rec.current = null;
      setListening(false);
      setHeard("");
    };
    try {
      r.start();
      rec.current = r;
      setListening(true);
      setError("");
    } catch {
      setError(micError(""));
      setTyping(true);
    }
  }

  // Stops listening and sends nothing.
  function hush() {
    const r = rec.current;
    rec.current = null;
    r?.abort();
    setListening(false);
    setHeard("");
  }

  const messages = [...WELCOME, ...chat.messages];
  const busy = pending || listening;
  return (
    <div className="flex h-[100dvh] flex-col bg-card">
      <header className="shrink-0 bg-primary pt-[env(safe-area-inset-top)] text-primary-foreground">
        <div className="mx-auto max-w-[680px] px-4 py-2.5">
          <h1 className="text-lg font-bold leading-tight">ezworkspace</h1>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-white/85">
            <LockClosedIcon aria-hidden className="h-3.5 w-3.5 shrink-0" />
            Private. Only you see this.
          </p>
        </div>
      </header>
      <Quiet>
        <Progress deviceId={deviceId} />
      </Quiet>

      <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div role="log" aria-live="polite" aria-label="Conversation" className="mx-auto flex max-w-[680px] flex-col gap-2 px-3 py-4 sm:px-4">
          {messages.map((m, i) => {
            const grouped = i > 0 && messages[i - 1].role === m.role;
            return m.role === "me" ? (
              <p
                key={m.id}
                className={cn(
                  "max-w-[85%] self-end whitespace-pre-wrap break-words rounded-[20px] rounded-br-md bg-primary px-4 py-2.5 text-[17px] leading-snug text-primary-foreground sm:text-base",
                  !grouped && "mt-2",
                )}
              >
                <span className="sr-only">You: </span>
                {m.body}
              </p>
            ) : (
              <div key={m.id} className={cn("flex max-w-[85%] flex-col items-start self-start", !grouped && "mt-2")}>
                <p className="whitespace-pre-wrap break-words rounded-[20px] rounded-bl-md bg-muted px-4 py-2.5 text-[17px] leading-snug sm:text-base">
                  <span className="sr-only">ezworkspace: </span>
                  {m.body}
                </p>
                {/* Welcome bubbles can't be read aloud before a first message, so they get no dead control. */}
                {!m.id.startsWith("welcome-") && (
                  <ListenButton
                    state={voice.state(m.id)}
                    onClick={() =>
                      chat.chatted ? voice.toggle(m) : setError("Send your first message, then I can read messages out loud.")
                    }
                  />
                )}
              </div>
            );
          })}
          {pending && (
            <div className="mt-2 flex items-center gap-1 self-start rounded-[20px] rounded-bl-md bg-muted px-4 py-3.5">
              <span className="sr-only">ezworkspace is typing</span>
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
          <div ref={endRef} />
        </div>
      </div>

      <div className="shrink-0 border-t bg-card pb-[max(env(safe-area-inset-bottom),0.75rem)]">
        <div className="mx-auto max-w-[680px]">
          <ul aria-label="Suggestions" className="flex gap-2 overflow-x-auto px-3 py-2.5 sm:px-4">
            {CHIPS.map((text) => (
              <li key={text} className="shrink-0">
                <button type="button" disabled={busy} onClick={() => void send(text)} className={CHIP}>
                  {text}
                </button>
              </li>
            ))}
            {/* Erasing is one chip away, so it arms first like every destructive control. */}
            <li className="shrink-0">
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  if (!armDelete) return setArmDelete(true);
                  setArmDelete(false);
                  void send("DELETE");
                }}
                className={cn(CHIP, armDelete && "border-destructive bg-destructive text-destructive-foreground hover:bg-destructive")}
              >
                {armDelete ? "Tap again to erase" : "Delete my data"}
              </button>
            </li>
          </ul>
          {error && (
            <p role="alert" className="flex items-start gap-1.5 px-4 pb-2 text-sm font-semibold text-destructive">
              <ExclamationTriangleIcon aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </p>
          )}
          {typing ? (
            <form
              className="flex items-end gap-2 px-3 sm:px-4"
              onSubmit={(e) => {
                e.preventDefault();
                void send(draft);
              }}
            >
              {Recognizer && (
                <button
                  type="button"
                  aria-label="Talk instead"
                  disabled={pending}
                  onClick={() => {
                    setTyping(false);
                    listen();
                  }}
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-input transition-colors duration-150 hover:bg-muted disabled:opacity-50"
                >
                  <MicIcon className="h-5 w-5" />
                </button>
              )}
              <label htmlFor="chat-input" className="sr-only">
                Message ezworkspace
              </label>
              <textarea
                id="chat-input"
                ref={inputRef}
                rows={1}
                maxLength={500}
                enterKeyHint="send"
                placeholder="Type a message"
                // Focus only when the person chose to type, never on page load.
                autoFocus={!!Recognizer}
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value);
                  const t = e.target;
                  t.style.height = "auto";
                  t.style.height = `${Math.min(t.scrollHeight, 136)}px`;
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    void send(draft);
                  }
                }}
                className="min-h-[44px] flex-1 resize-none rounded-[22px] border border-input bg-card px-4 py-2.5 text-[17px] leading-snug placeholder:text-muted-foreground sm:text-base"
              />
              <button
                type="submit"
                aria-label="Send"
                disabled={pending || !draft.trim()}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition-opacity duration-150 disabled:opacity-35"
              >
                {pending ? (
                  <ReloadIcon aria-hidden className="h-5 w-5 animate-spin" />
                ) : (
                  <PaperPlaneIcon aria-hidden className="h-5 w-5" />
                )}
              </button>
            </form>
          ) : (
            <div className="px-4">
              <p
                className={cn(
                  "mx-auto line-clamp-3 min-h-[1.375em] max-w-[36ch] text-center text-[17px] leading-snug",
                  heard ? "font-semibold" : "text-muted-foreground",
                )}
              >
                {heard
                  ? heard.length > 140
                    ? `…${heard.slice(-140)}`
                    : heard
                  : listening
                    ? "Listening…"
                    : pending
                      ? "One moment…"
                      : "Tap the mic and talk."}
              </p>
              <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center justify-items-center">
                <DockButton
                  label="Type"
                  onClick={() => {
                    hush();
                    setTyping(true);
                  }}
                >
                  <KeyboardIcon aria-hidden className="h-5 w-5" />
                </DockButton>
                <button
                  type="button"
                  aria-label="Talk"
                  aria-pressed={listening}
                  disabled={pending && !listening}
                  onClick={listen}
                  className="relative grid h-[72px] w-[72px] place-items-center rounded-full bg-primary text-primary-foreground transition-transform duration-150 ease-out-expo active:scale-95 disabled:opacity-50"
                >
                  {listening && <span aria-hidden className="absolute inset-0 animate-ping rounded-full bg-primary/25" />}
                  {listening ? (
                    <StopIcon aria-hidden className="relative h-7 w-7" />
                  ) : (
                    <MicIcon className="relative h-8 w-8" />
                  )}
                </button>
                <DockButton
                  label="Read replies aloud"
                  pressed={readAloud}
                  onClick={() => {
                    const next = !readAloud;
                    setReadAloud(next);
                    save("ezw.readAloud", next ? "on" : "off");
                    if (!next) voice.stop();
                  }}
                >
                  {readAloud ? (
                    <SpeakerLoudIcon aria-hidden className="h-5 w-5" />
                  ) : (
                    <SpeakerOffIcon aria-hidden className="h-5 w-5" />
                  )}
                </DockButton>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// A missing or failing progress query hides the strip instead of taking the chat down.
class Quiet extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/** The worker's own progress, under the header. Hidden until there is some. */
function Progress({ deviceId }: { deviceId: string }) {
  const me = useQuery(api.progress.mine, { deviceId });
  if (!me) return null;
  const skills = me.skills.length;
  return (
    <div className="shrink-0 bg-go-soft">
      <p className="mx-auto max-w-[680px] px-4 py-2 text-[15px] font-semibold tabular-nums">
        <span className="sr-only">Your progress: </span>
        {Math.round(me.hoursPerWeek * 10) / 10} hrs/week back · {skills} {skills === 1 ? "skill" : "skills"}
        {me.steps > 0 && ` · Step ${me.step} of ${me.steps}`}
      </p>
    </div>
  );
}

/** Pictogram mic drawn on the Radix 15px grid, which has no mic of its own. */
function MicIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeLinecap="round" className={className}>
      <rect x="5.5" y="1.5" width="4" height="7.5" rx="2" />
      <path d="M3.5 7.5a4 4 0 0 0 8 0M7.5 11.5v2M5.5 13.5h4" />
    </svg>
  );
}

function DockButton({
  label,
  pressed,
  onClick,
  children,
}: {
  label: string;
  pressed?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className="flex flex-col items-center gap-1 whitespace-nowrap rounded-md px-1 py-0.5 text-sm font-semibold leading-tight text-muted-foreground transition-colors duration-150 hover:text-foreground"
    >
      <span
        className={cn(
          "grid h-12 w-12 place-items-center rounded-full border border-input text-foreground transition-colors duration-150",
          pressed && "border-primary bg-primary text-primary-foreground",
        )}
      >
        {children}
      </span>
      {label}
    </button>
  );
}

type VoiceState = "idle" | "loading" | "playing";

function ListenButton({ state, onClick }: { state: VoiceState; onClick: () => void }) {
  const Icon = state === "loading" ? ReloadIcon : state === "playing" ? StopIcon : SpeakerLoudIcon;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={state === "idle" ? "Listen to this message" : state === "loading" ? "Loading voice. Tap to cancel" : "Stop"}
      className={cn(
        "mt-0.5 inline-flex min-h-9 items-center gap-1.5 rounded-md px-2 text-sm font-semibold transition-colors duration-150",
        state === "idle" ? "text-muted-foreground hover:text-foreground" : "text-foreground",
      )}
    >
      <Icon aria-hidden className={cn("h-4 w-4", state === "loading" && "animate-spin")} />
      {state === "idle" ? "Listen" : state === "loading" ? "Loading…" : "Stop"}
    </button>
  );
}

/** Reads coach messages aloud through one shared player, so only one voice ever plays. */
function useVoice(deviceId: string, setError: (text: string) => void) {
  const speak = useAction(api.voice.speak);
  const player = useRef<HTMLAudioElement | null>(null);
  const ticket = useRef(0); // bumps on every play or stop, so a slow request can't start a second voice
  const clips = useRef(new Map<string, string>());
  const [now, setNow] = useState<{ id: string; playing: boolean } | null>(null);

  useEffect(() => () => player.current?.pause(), []);

  function stop() {
    ticket.current++;
    player.current?.pause();
    setNow(null);
  }

  // Call inside a tap: iOS then lets this same player start a clip after a network wait.
  function unlock() {
    const el = (player.current ??= new Audio());
    el.src = SILENT;
    void el.play().catch(() => {});
    return el;
  }

  async function play(m: Msg) {
    stop();
    const mine = ticket.current;
    const el = clips.current.has(m.id) ? (player.current ??= new Audio()) : unlock();
    setNow({ id: m.id, playing: false });
    setError("");
    try {
      const clip = clips.current.get(m.id) ?? (await speak({ deviceId, text: m.body.slice(0, 900) }));
      clips.current.set(m.id, clip);
      if (mine !== ticket.current) return;
      el.src = `data:audio/mpeg;base64,${clip}`;
      el.onended = () => mine === ticket.current && setNow(null);
      await el.play();
      if (mine === ticket.current) setNow({ id: m.id, playing: true });
    } catch (e) {
      if (mine !== ticket.current) return;
      setNow(null);
      setError(failure(e, "Couldn't play that message. Try again."));
    }
  }

  return {
    play,
    stop,
    unlock,
    toggle: (m: Msg) => (now?.id === m.id ? stop() : void play(m)),
    state: (id: string): VoiceState => (now?.id !== id ? "idle" : now.playing ? "playing" : "loading"),
  };
}
