import { cn } from "@/lib/utils";
import { ArrowRightIcon, CheckIcon, LockClosedIcon, LockOpen1Icon } from "@radix-ui/react-icons";
import type { ReactNode } from "react";

// The one signature move: the way to the team map drawn as a wayfinding route.
// Stops fill green when done; the yellow plate always marks what happens next.

export function Wordmark({ className }: { className?: string }) {
  return <span className={cn("font-bold tracking-[-0.01em]", className)}>ezworkspace</span>;
}

/** Charcoal overhead-sign band shared by every surface. */
export function SignBand({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <header className="bg-primary text-primary-foreground">
      <div className={cn("mx-auto flex h-14 max-w-[1376px] items-center gap-4 px-4 sm:px-8", className)}>
        <Wordmark className="text-xl" />
        {children}
      </div>
    </header>
  );
}

export function NextPlate({ children, className, href }: { children: ReactNode; className?: string; href?: string }) {
  const plate = cn(
    "inline-flex animate-rise items-center gap-2 rounded-md bg-signal px-3 py-1.5 text-lg font-bold leading-tight text-signal-foreground",
    href && "decoration-2 underline-offset-4 hover:underline",
    className,
  );
  const body = (
    <>
      <ArrowRightIcon aria-hidden className="h-5 w-5 shrink-0" />
      {children}
    </>
  );
  return href ? (
    <a
      href={href}
      className={plate}
      // Focus the action where it sits: a fragment jump would scroll the route itself out of view.
      onClick={(e) => {
        e.preventDefault();
        document.querySelector<HTMLElement>(href)?.focus();
      }}
    >
      {body}
    </a>
  ) : (
    <span className={plate}>{body}</span>
  );
}

export function DonePlate({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex animate-rise items-center gap-2 rounded-md bg-go px-3 py-1.5 text-lg font-bold leading-tight text-white">
      <CheckIcon aria-hidden className="h-5 w-5 shrink-0" />
      {children}
    </span>
  );
}

export function Connector({ done, className }: { done: boolean; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "block h-1 min-w-3 flex-1 rounded-full transition-colors duration-700",
        done ? "bg-go" : "bg-[repeating-linear-gradient(90deg,hsl(var(--input))_0_6px,transparent_6px_11px)]",
        className,
      )}
    />
  );
}

/** A voice on the route: filled when a worker has joined, dashed while the seat is open. */
export function VoiceDot({ filled, fresh }: { filled: boolean; fresh?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "block h-7 w-7 shrink-0 rounded-full border-2 transition-colors duration-500",
        filled ? "border-go bg-go" : "border-dashed border-input bg-card",
        fresh && "animate-pop",
      )}
    />
  );
}

// Stops on the dashboard route (lg), the signed-out diagram (md) and before panel titles (sm).
const STOP_SIZE = {
  sm: ["h-6 w-6 border-2", "h-3.5 w-3.5"],
  md: ["h-8 w-8 border-[3px]", "h-4 w-4"],
  lg: ["h-11 w-11 border-[3px]", "h-5 w-5"],
} as const;

/** An interchange stop: ring while waiting, solid with a check once done. */
export function StopCircle({ done, lock, size = "md" }: { done: boolean; lock?: boolean; size?: keyof typeof STOP_SIZE }) {
  const Icon = lock ? (done ? LockOpen1Icon : LockClosedIcon) : CheckIcon;
  const [ring, icon] = STOP_SIZE[size];
  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center rounded-full transition-colors duration-500",
        ring,
        done ? "border-go bg-go text-white" : "border-primary bg-card text-primary",
      )}
    >
      {(done || lock) && <Icon className={icon} />}
    </span>
  );
}
