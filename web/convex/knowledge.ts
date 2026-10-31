import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import { action, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { getTeam, isEmployer, requireCoo } from "./util";

const MAX_CHARS = 15000;
const kindValidator = v.union(v.literal("url"), v.literal("text"), v.literal("video"));
const VIDEO = /youtube\.com|youtu\.be|vimeo\.com|loom\.com|\.(mp4|mov|webm)(\?|$)/i;

// The COO adds a team SOP: pasted text, or a page or video link read with Firecrawl.
export const add = action({
  args: { url: v.optional(v.string()), text: v.optional(v.string()), title: v.optional(v.string()) },
  handler: async (ctx, args): Promise<null> => {
    await requireCoo(ctx);
    const url = args.url?.trim();
    let text = args.text?.trim() ?? "";
    let title = args.title?.trim() ?? "";
    let kind: "url" | "text" | "video" = "text";
    if (url) {
      const page = await scrape(url);
      text = page.text;
      title ||= page.title || url;
      kind = VIDEO.test(url) ? "video" : "url";
    }
    if (!text) throw new ConvexError(url ? "That link had no text to learn from." : "Paste a link or some text.");
    await ctx.runMutation(internal.knowledge.insert, {
      title: (title || text.split("\n")[0].replace(/^[#\s]+/, "")).slice(0, 120),
      kind,
      ...(url ? { url } : {}),
      text: text.slice(0, MAX_CHARS),
    });
    return null;
  },
});

// Reads one page with Firecrawl. A video page gives whatever transcript or description the scrape finds.
export async function scrape(url: string): Promise<{ text: string; title: string }> {
  if (!/^https?:\/\/\S+$/i.test(url)) throw new ConvexError("Enter a full link that starts with https://.");
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) throw new ConvexError("Set FIRECRAWL_API_KEY in Convex first.");
  const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ url, formats: ["markdown"] }),
  });
  if (!res.ok) throw new ConvexError(`Couldn't read that link (${res.status}).`);
  const { data } = await res.json();
  return { text: (data?.markdown || data?.metadata?.description || "").trim(), title: data?.metadata?.title || "" };
}

export const insert = internalMutation({
  args: { title: v.string(), kind: kindValidator, url: v.optional(v.string()), text: v.string() },
  handler: async (ctx, doc) => {
    const team = await getTeam(ctx);
    await ctx.db.insert("knowledge", { teamId: team._id, ...doc, chars: doc.text.length, addedAt: Date.now() });
    return null;
  },
});

// The COO's list of sources, newest first. The text itself only goes to the coach.
export const list = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isEmployer(ctx))) return null;
    const team = await ctx.db.query("teams").first();
    if (!team) return [];
    const rows = await ctx.db.query("knowledge").withIndex("by_team", (q) => q.eq("teamId", team._id)).order("desc").take(100);
    return rows.map((k) => ({ _id: k._id, title: k.title, kind: k.kind, url: k.url ?? null, chars: k.chars, addedAt: k.addedAt }));
  },
});

export const remove = mutation({
  args: { id: v.id("knowledge") },
  handler: async (ctx, { id }) => {
    await requireCoo(ctx);
    if (await ctx.db.get("knowledge", id)) await ctx.db.delete("knowledge", id);
    return null;
  },
});

// Only ingest reads this, to ground one reply.
export const sources = internalQuery({
  args: {},
  handler: async (ctx) => {
    const team = await ctx.db.query("teams").first();
    if (!team) return [];
    const rows = await ctx.db.query("knowledge").withIndex("by_team", (q) => q.eq("teamId", team._id)).take(50);
    return rows.map(({ title, text }) => ({ title, text }));
  },
});

type Source = { title: string; text: string };

// Chunks of up to 800 characters, cut at a line break when there is one.
export const chunks = (text: string) => text.match(/[\s\S]{1,800}(?=\n|$)|[\s\S]{1,800}/g)?.filter((c) => c.trim()) ?? [];

const STOP = new Set(["what", "when", "where", "which", "with", "that", "this", "have", "from", "your", "about", "there", "their", "they", "does", "should", "would", "could", "into", "than", "then", "them", "will", "just", "like", "need", "want", "know", "tell"]);
// Words of 4+ letters cut to 5, so "prices" meets "price" and "escalation" meets "escalate".
const terms = (s: string) =>
  new Set((s.toLowerCase().match(/[a-z]{4,}/g) ?? []).filter((w) => !STOP.has(w)).map((w) => w.slice(0, 5)));

// The (up to) n source chunks that share the most words with the message, with their titles.
// shortcut: keyword overlap, no embeddings; fine for a few SOPs, use vector search for a big library
export function pick(sources: Source[], message: string, n = 2): Source[] {
  const want = terms(message);
  if (!want.size) return [];
  return sources
    .flatMap((s) => chunks(s.text).map((text) => ({ title: s.title, text: text.trim() })))
    .map((c) => ({ c, score: [...terms(`${c.title} ${c.text}`)].filter((w) => want.has(w)).length }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, n)
    .map((x) => x.c);
}
