# Nebula: where the redesigned workflow runs

**What it is:** Nebula (nebula.gg) is an agent-native workspace. People and agents share channels, and agents act in connected apps like Gmail, Sheets, Slack and Linear. Every request, reply and follow-up action appears in the channel, where the whole team can read it.

## What the research found (2026-10-30)
- **No public way to call in.** I found no public API, webhook or email trigger for posting into a channel or starting a run from outside, and no CLI page. Do not promise one to the judges.
- **Calls go the other way.** Settings → Account → External agents → "Add external agent" lets you register a CLI, a stdio MCP server or an **OpenAI-compatible API endpoint**. Nebula then sends each tagged message to that endpoint as one chat completion.
- **A human check is built in.** Agents "start at most six tasks after a person last wrote in the channel," and then a person has to reply before they continue.
- **Pricing:** $25 per seat per month with a **7-day free trial**. No other free tier. Credits are needed only for Nebula's own agents. A connected agent (Claude or ChatGPT) runs on your own plan.

## Setup (about 15 min, by 7:30pm)
1. Sign up and start the 7-day trial. Create a workspace called **Acme Insurance**.
2. Connections: link **Gmail** and **Google Sheets**. Make a sheet called `AP Exceptions` with 4 rows (vendor, invoice #, PO mismatch, amount).
3. Create a channel called **#ap-redesign**. Pin this message: *"Redesign approved by 5 voices + COO Compact. Agent drafts, Maria approves. No email leaves without Maria's ✅."*
4. In the channel, tag the agent: *"@agent For each row in AP Exceptions, draft a resolution email as a **Gmail draft (do not send)** and post a summary here. Wait for Maria's ✅ before sending."*
5. Reply ✅ to one draft so the channel shows the full loop: draft, then human approval, then sent. Take a screenshot as a backup in case the network fails at the table.

## Hand-off from the ezworkspace dashboard
Use a link, not an API call. When the map unseals, show the button **"Run redesign in Nebula →"**. It opens the #ap-redesign channel URL (copy it from the browser bar). The judge sees a channel already filled with drafts and Maria's approvals.

*Stretch, skip unless there is spare time:* register ezworkspace's backend as an external agent (OpenAI-compatible endpoint) so `@quorum` can answer in the channel with the team's aggregate map.

## Pitch line
"ezworkspace decides *what* gets automated and who shares the savings. Nebula is *where* it runs, with every agent action posted in a channel for a human to approve. Maria stays accountable for her work, so nobody ends up worse off than before."
