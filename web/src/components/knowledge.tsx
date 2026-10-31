import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ExternalLinkIcon, ReloadIcon } from "@radix-ui/react-icons";
import { useAction, useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import { ArmedButton, InlineError, Panel, errorText } from "./dashboard";

type Source = NonNullable<FunctionReturnType<typeof api.knowledge.list>>[number];

const KIND: Record<Source["kind"], string> = { url: "Link", text: "Text", video: "Video" };

export function Knowledge({ className }: { className?: string }) {
  const sources = useQuery(api.knowledge.list);
  return (
    <Panel
      id="knowledge-title"
      title="Team knowledge"
      description="The coach teaches from your SOPs, docs and training videos, and names the source."
      className={className}
    >
      <AddLink />
      <AddText />
      {sources &&
        (sources.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No sources yet. Add a link or paste an SOP.</p>
        ) : (
          <ul className="mt-4 divide-y border-t">
            {sources.map((s) => (
              <SourceRow key={s._id} source={s} />
            ))}
          </ul>
        ))}
    </Panel>
  );
}

function AddLink() {
  const add = useAction(api.knowledge.add);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <>
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          add({ url: url.trim() })
            .then(
              () => setUrl(""),
              (err) => setError(errorText(err, "Couldn't add that link. Try again.")),
            )
            .finally(() => setBusy(false));
        }}
      >
        <div className="min-w-[200px] flex-1">
          <label htmlFor="knowledge-url" className="text-sm font-semibold">
            Paste a link (SOP, doc, video)
          </label>
          <Input
            id="knowledge-url"
            type="url"
            required
            placeholder="https://"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="mt-1 h-10 border-input text-base"
          />
        </div>
        <Button type="submit" disabled={busy} className="h-10 min-w-[112px]">
          {busy ? (
            <>
              <ReloadIcon aria-hidden className="mr-2 h-4 w-4 animate-spin" />
              Reading…
            </>
          ) : (
            "Add link"
          )}
        </Button>
      </form>
      {error && <InlineError>{error}</InlineError>}
    </>
  );
}

function AddText() {
  const add = useAction(api.knowledge.add);
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <>
      <form
        className="mt-4"
        onSubmit={(e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          add({ text, title: title.trim() || undefined })
            .then(
              () => {
                setText("");
                setTitle("");
              },
              (err) => setError(errorText(err, "Couldn't add that SOP. Try again.")),
            )
            .finally(() => setBusy(false));
        }}
      >
        <label htmlFor="knowledge-text" className="text-sm font-semibold">
          Paste an SOP
        </label>
        {/* Plain textarea, not ui/textarea: that one drops the house focus ring. */}
        <textarea
          id="knowledge-text"
          required
          rows={4}
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="mt-1 block w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground"
        />
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <div className="min-w-[200px] flex-1">
            <label htmlFor="knowledge-name" className="text-sm font-semibold">
              Title <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <Input
              id="knowledge-name"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 h-10 border-input text-base"
            />
          </div>
          <Button type="submit" disabled={busy} className="h-10 min-w-[112px]">
            {busy ? (
              <>
                <ReloadIcon aria-hidden className="mr-2 h-4 w-4 animate-spin" />
                Adding…
              </>
            ) : (
              "Add text"
            )}
          </Button>
        </div>
      </form>
      {error && <InlineError>{error}</InlineError>}
    </>
  );
}

function SourceRow({ source: s }: { source: Source }) {
  const remove = useMutation(api.knowledge.remove);
  const [error, setError] = useState("");
  return (
    <li className="py-3">
      <div className="flex items-start gap-x-4">
        <div className="min-w-0 flex-1">
          <p className="font-bold leading-snug [overflow-wrap:anywhere]">{s.title}</p>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            <span className="rounded-sm bg-muted px-2 py-0.5 font-semibold text-foreground">{KIND[s.kind]}</span>
            <span className="tabular-nums">{s.chars.toLocaleString("en-US")} characters</span>
          </p>
          {s.url && (
            <a
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex max-w-full items-start gap-1.5 rounded-sm text-sm underline hover:no-underline"
            >
              <ExternalLinkIcon aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span className="line-clamp-1 [overflow-wrap:anywhere]">{s.url}</span>
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          )}
        </div>
        <ArmedButton
          label={
            <>
              Remove<span className="sr-only"> {s.title}</span>
            </>
          }
          armedLabel="Click again to remove"
          onConfirm={() => remove({ id: s._id }).catch((err) => setError(errorText(err, "Couldn't remove it. Try again.")))}
          className="shrink-0"
        />
      </div>
      {error && <InlineError>{error}</InlineError>}
    </li>
  );
}
