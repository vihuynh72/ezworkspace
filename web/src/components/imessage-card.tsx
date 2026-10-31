import { Button } from "@/components/ui/button";

// The Photon (Spectrum) iMessage line the coach texts from.
export const COACH_NUMBER = "+14155901577";
export const COACH_NUMBER_PRETTY = "+1 (415) 590-1577";

const TRY_THESE = [
  { text: "START", why: "Begin your newest training, step by step." },
  { text: "What do I do if the vendor's price doesn't match the PO?", why: "Ask in the moment. Answers come from your company's SOP." },
  { text: "Send a photo of an invoice", why: "The coach tells you what to check." },
  { text: "Will AI replace me?", why: "Ask anything. Your manager never sees it." },
];

function downloadContact() {
  const vcard = ["BEGIN:VCARD", "VERSION:3.0", "FN:ezworkspace Coach", "ORG:ezworkspace", `TEL;TYPE=CELL:${COACH_NUMBER}`, "END:VCARD"].join("\r\n");
  const url = URL.createObjectURL(new Blob([vcard], { type: "text/vcard" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: "ezworkspace-coach.vcf" });
  a.click();
  URL.revokeObjectURL(url);
}

// How workers reach the coach outside the web app: one iMessage thread, no app to install.
export function IMessageCard({ compact = false }: { compact?: boolean }) {
  return (
    <section aria-labelledby="imessage-title" className="rounded-xl border bg-card p-5 shadow-sm sm:p-6">
      <p className="text-sm font-bold uppercase tracking-wide text-muted-foreground">On iMessage, powered by Photon</p>
      <h2 id="imessage-title" className="mt-1 text-2xl font-bold tracking-[-0.01em]">
        Text your coach: <span className="whitespace-nowrap">{COACH_NUMBER_PRETTY}</span>
      </h2>
      <p className="mt-1 text-muted-foreground">No app to install. Train here on the web, then keep your coach in your pocket while you work.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button asChild size="lg">
          <a href={`sms:${COACH_NUMBER}&body=START`}>Text START</a>
        </Button>
        <Button variant="outline" size="lg" onClick={downloadContact}>
          Add the contact
        </Button>
      </div>
      {!compact && (
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {TRY_THESE.map((t) => (
            <li key={t.text} className="rounded-lg border bg-background p-3">
              <p className="font-bold">"{t.text}"</p>
              <p className="text-sm text-muted-foreground">{t.why}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
