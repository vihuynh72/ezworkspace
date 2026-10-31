import { cn } from "@/lib/utils";
import {
  ExclamationTriangleIcon,
  LockClosedIcon,
  PaperPlaneIcon,
  ReloadIcon,
  SpeakerLoudIcon,
  StopIcon,
} from "@radix-ui/react-icons";
import { useAction, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { useEffect, useRef, useState } from "react";
import { api } from "../../convex/_generated/api";

type Msg = { id: string; role: "me" | "coach"; body: string; at: number };
type Saved = { messages: Msg[]; seen: string[]; chatted: boolean };

const WELCOME: Msg[] = [
  "Hi, I'm ezworkspace, a private coach for your work. No AI experience needed.",
  "Will this be used to cut your job? No. Your company only sees team totals, and nothing at all until 5 coworkers join and it promises no pay cuts or AI layoffs for 12 months.",
  "Tell me one thing you do every week, and whether you use AI for it. Or ask me anything.\n\nYou can also send PLAN for your private plan, or TRY to practice a task with AI (nothing gets sent anywhere).",
].map((body, i) => ({ id: `welcome-${i}`, role: "coach", body, at: 0 }));

// Harmless suggestions only; erasing lives apart, in the header.
const CHIPS: { text: string; hint?: string }[] = [
  { text: "What can AI do for my job?" },
  { text: "I use ChatGPT to draft vendor emails, saves 2 hours a week" },
  { text: "PLAN", hint: "Get your private transition plan" },
  { text: "TRY", hint: "Practice one real task with AI" },
];

// Same words the server treats as "erase me".
const ERASE = /^\s*(delete|stop|forget me)\s*$/i;
// One silent WAV sample, played inside the tap so iOS lets the voice note play after the network wait.
const SILENT = "data:audio/wav;base64,UklGRiUAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQEAAACA";

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
  const sendToCoach = useAction(api.ingest.web);
  const inbox = useQuery(api.outbox.webInbox, { deviceId });
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const voice = useVoice(deviceId, chat.chatted, setError);

  useEffect(() => save("ezw.chat.v1", JSON.stringify({ ...chat, messages: chat.messages.slice(-100) })), [chat]);

  // Pushes (like the dividend receipt) arrive once each, as incoming bubbles.
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

  async function send(text: string) {
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
    } catch (e) {
      setChat((c) => ({ ...c, messages: c.messages.filter((m) => m.id !== mine.id) }));
      setDraft(body);
      setError(failure(e, "Couldn't reach ezworkspace. Check your connection and try again."));
    } finally {
      setPending(false);
    }
  }

  const messages = [...WELCOME, ...chat.messages];
  return (
    <div className="flex h-[100dvh] flex-col bg-card">
      <header className="shrink-0 bg-primary pt-[env(safe-area-inset-top)] text-primary-foreground">
        <div className="mx-auto flex max-w-[680px] items-center gap-2 px-4 py-2.5">
          <div className="min-w-0">
            <h1 className="text-lg font-bold leading-tight">ezworkspace</h1>
            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-white/85">
              <LockClosedIcon aria-hidden className="h-3.5 w-3.5 shrink-0" />
              Private. Only you see this.
            </p>
          </div>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (!armDelete) return setArmDelete(true);
              setArmDelete(false);
              void send("DELETE");
            }}
            className={cn(
              "ml-auto min-h-11 shrink-0 whitespace-nowrap rounded-md px-2.5 text-sm font-semibold transition-colors duration-150 disabled:opacity-50",
              armDelete
                ? "bg-destructive text-destructive-foreground"
                : "text-white/85 underline underline-offset-4 hover:text-white",
            )}
          >
            {armDelete ? "Tap again to erase" : "Erase my data"}
          </button>
        </div>
      </header>

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
                  <ListenButton state={voice.state(m.id)} onClick={() => voice.toggle(m)} />
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
            {CHIPS.map(({ text, hint }) => (
              <li key={text} className="shrink-0">
                <button
                  type="button"
                  disabled={pending}
                  aria-label={hint ? `${text}: ${hint}` : undefined}
                  onClick={() => void send(text)}
                  className="h-9 whitespace-nowrap rounded-full border border-input bg-card px-3.5 text-[15px] font-semibold transition-colors duration-150 hover:bg-muted disabled:opacity-50"
                >
                  {text}
                </button>
              </li>
            ))}
          </ul>
          {error && (
            <p role="alert" className="flex items-start gap-1.5 px-4 pb-2 text-sm font-semibold text-destructive">
              <ExclamationTriangleIcon aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </p>
          )}
          <form
            className="flex items-end gap-2 px-3 sm:px-4"
            onSubmit={(e) => {
              e.preventDefault();
              void send(draft);
            }}
          >
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
        </div>
      </div>
    </div>
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

/** Reads coach messages aloud, one at a time. */
function useVoice(deviceId: string, chatted: boolean, setError: (text: string) => void) {
  const speak = useAction(api.voice.speak);
  const player = useRef<HTMLAudioElement | null>(null);
  const ticket = useRef(0); // bumps on every Listen or Stop, so a slow request can't start a second voice
  const clips = useRef(new Map<string, string>());
  const [now, setNow] = useState<{ id: string; playing: boolean } | null>(null);

  useEffect(() => () => player.current?.pause(), []);

  function stop() {
    ticket.current++;
    player.current?.pause();
    setNow(null);
  }

  async function toggle(m: Msg) {
    const wasThis = now?.id === m.id;
    stop();
    if (wasThis) return;
    if (!chatted) return setError("Send your first message, then I can read messages out loud.");
    const mine = ticket.current;
    const el = (player.current ??= new Audio());
    setNow({ id: m.id, playing: false });
    setError("");
    try {
      if (!clips.current.has(m.id)) {
        el.src = SILENT;
        void el.play().catch(() => {});
      }
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
    toggle,
    state: (id: string): VoiceState => (now?.id !== id ? "idle" : now.playing ? "playing" : "loading"),
  };
}
