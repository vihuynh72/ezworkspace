import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import { action, internalMutation, query } from "./_generated/server";

const evidenceValidator = v.array(v.object({ title: v.string(), url: v.string() }));

// Searches the public web (Firecrawl) for WARN notices or layoff news about a Compact signer.
// A hit never revokes anything by itself: it moves the company to "pending review" for a human.
export const check = action({
  args: { company: v.string() },
  handler: async (ctx, { company }): Promise<null> => {
    if (!(await ctx.auth.getUserIdentity())) throw new ConvexError("Sign in as the COO first.");
    const key = process.env.FIRECRAWL_API_KEY;
    if (!key) throw new ConvexError("Set FIRECRAWL_API_KEY in Convex first.");
    const name = company.trim();
    if (!name) throw new ConvexError("Enter a company name.");
    const res = await fetch("https://api.firecrawl.dev/v2/search", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query: `"${name}" WARN notice layoffs`, limit: 8 }),
    });
    if (!res.ok) throw new ConvexError(`Firecrawl search failed (${res.status}).`);
    const json = await res.json();
    // v2 returns { data: { web: [...] } }; v1 returned { data: [...] }
    const results: { title?: string; url?: string; description?: string }[] = json.data?.web ?? json.data ?? [];
    // The company must be named in the headline itself; textbooks and examples only mention it in passing.
    const fullName = name.toLowerCase();
    const evidence = results
      .filter((r) => {
        const title = (r.title ?? "").toLowerCase();
        const text = `${title} ${r.description ?? ""}`.toLowerCase();
        return title.includes(fullName) && /\bwarn\b|layoff|laid off|job cuts|cutting \d+ jobs/.test(text);
      })
      .slice(0, 3)
      .map((r) => ({ title: (r.title ?? r.url ?? "").slice(0, 140), url: r.url ?? "" }));
    await ctx.runMutation(internal.registry.record, { company: name, evidence });
    return null;
  },
});

export const record = internalMutation({
  args: { company: v.string(), evidence: evidenceValidator },
  handler: async (ctx, { company, evidence }) => {
    const doc = {
      company,
      evidence,
      status: evidence.length ? ("pending_review" as const) : ("clear" as const),
      checkedAt: Date.now(),
    };
    const existing = await ctx.db.query("registry").withIndex("by_company", (q) => q.eq("company", company)).unique();
    if (existing) await ctx.db.replace("registry", existing._id, doc);
    else await ctx.db.insert("registry", doc);
    return null;
  },
});

// Public on purpose: anyone can look up whether an employer signed and kept the Compact.
export const list = query({
  args: {},
  handler: async (ctx) => await ctx.db.query("registry").order("desc").take(20),
});
