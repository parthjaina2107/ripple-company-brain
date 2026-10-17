# Ripple — submission description

**Track:** Track 03 — Company Brain.

**Tagline:** When a policy changes, find every connected piece of knowledge that needs attention.

## Short description

When a company changes its refund window, which guides, workflows and saved agent replies quietly become wrong? Ripple connects those sources to reviewed claims and versioned policies in FalkorDB. A policy decision triggers dependency discovery, evidence-backed correction proposals and a separate queue for workflows that require human judgment. Owners approve repairs and export correction packets containing the source, before/after text, decision and graph evidence. Questions retrieve approved policy context across sessions, with audience exceptions and effective dates preserved.

## What we built

Ripple combines separate company graphs with bounded public-policy research, exact-quote extraction, owner-approved baselines, change impact analysis, reviewed corrections and Markdown/JSON exports. Hosted Gemini extracts candidate claims and selects a read-only policy tool; deterministic checks and explicit approval govern writes. A public tour leads into a personal writable sandbox with a guided five-step journey and a controlled Acme help centre where approved corrections can be published. Real company login and membership management are available locally.

FalkorDB is the primary database for company knowledge, dependencies, policy versions, decisions, review tasks and correction history. Native Cypher traversals discover affected sources and return evidence paths. Removing the live database prevents company knowledge retrieval and repair; SQLite stores authentication records only. An explicitly labeled preview simulator exists for development and is not the submission runtime.

## Demonstrated result

The October 17 live verification used Gemini and FalkorDB Cloud together: an approved 30-day refund baseline, a 14-day change, a discovered conflicting source, an approved correction and export, then 14-day recall through a new database connection. Retrying correction application produced one correction record. A second company stayed empty. The fixture was synthetic, not misrepresented as an actual public company's policy.

The release passes 44 automated tests and the production build. Cloud checks verify correction integrity with two concurrent server connections, command deduplication, capacity rejection and backup restoration. The public deployed HTTP walkthrough verifies live Gemini, public research and approval, change/correction/export/publication, historical and enterprise answers, unsupported-question rejection and persistent workspace state. Its disposable sandbox was released afterward.

## Scope and limits

The current domain covers trial duration, refund windows, cancellation notice and initial support response times. Ripple edits stored sources, exports packets and publishes explicitly approved copies to its controlled sandbox help centre. Arbitrary external-site, Slack, Notion and Drive publishing are outside this demo. Website research reads public HTML/text on the supplied host, at most four pages; unsupported conditions and contracts require human interpretation. Real company accounts use local persistent SQLite auth. Hosted judges receive signed two-hour sandbox sessions. Atomic database revision checks reject concurrent stale saves; this is not a claim of full enterprise collaboration or unlimited scale.

## Links and status

- Source: [GitHub repository](https://github.com/parthjaina2107/ripple-company-brain).
- Setup: [LOCAL_SETUP.md](LOCAL_SETUP.md).
- Graph model and executable query explanation: [GRAPH_MODEL.md](GRAPH_MODEL.md), [QUERIES.md](QUERIES.md).
- Verification: [VERIFICATION.md](VERIFICATION.md).
- Demo rehearsal: [DEMO.md](DEMO.md).
- Blog draft: [BLOG_POST.md](BLOG_POST.md).
- Deployment: [live Acme demo](https://ripple-company-brain.vercel.app), backed by FalkorDB Cloud and Gemini. Click **Try your own sandbox** for the guided synthetic workflow; see [judge instructions](JUDGE_SANDBOX.md). Use local setup for real company accounts.
- Demo video: not recorded yet; add the actual working video URL before submission.
- Blog: written locally; add a published URL only after publishing and checking the event's submission process.

## AI assistance disclosure

OpenAI Codex assisted with implementation, debugging, testing and documentation.

Official requirements checked October 17, 2026: [event rules](https://www.wemakedevs.org/hackathons/falkordb/rules). Keep the actual registration, video, repository and final submission status accurate; no award outcome is promised.
