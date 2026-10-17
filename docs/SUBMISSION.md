# Ripple — submission description

**Track:** Track 03 — Company Brain.

**Tagline:** When a policy changes, find every connected piece of knowledge that needs attention.

## Short description

When a company changes its refund window, which guides, workflows and saved agent replies quietly become wrong? Ripple connects those sources to reviewed claims and versioned policies in FalkorDB. A policy decision triggers dependency discovery, evidence-backed correction proposals and a separate queue for workflows that require human judgment. Owners approve repairs and export correction packets containing the source, before/after text, decision and graph evidence. Questions retrieve approved policy context across sessions, with audience exceptions and effective dates preserved.

## What we built

Ripple combines company login and separate company graphs with bounded research of public policy pages, exact-quote extraction, owner-approved baselines, change impact analysis, reviewed corrections and Markdown/JSON exports. Gemini extracts candidate claims and chooses a supported read-only policy tool. Deterministic checks and human approval control writes. This division is deliberate: a language model can interpret a document without being allowed to invent company policy or publish changes.

FalkorDB is the primary database for company knowledge, dependencies, policy versions, decisions, review tasks and correction history. Native Cypher traversals discover affected sources and return evidence paths. Removing the live database prevents company knowledge retrieval and repair; SQLite stores authentication records only. An explicitly labeled preview simulator exists for development and is not the submission runtime.

## Demonstrated result

The October 17 live verification used Gemini and FalkorDB Cloud together: an approved 30-day refund baseline, a 14-day change, a discovered conflicting source, an approved correction and export, then 14-day recall through a new database connection. Retrying correction application produced one correction record. A second company stayed empty. The fixture was synthetic, not misrepresented as an actual public company's policy.

## Scope and limits

The current domain covers trial duration, refund windows, cancellation notice and initial support response times. Ripple edits its own stored copies and exports work; it does not publish to Slack, Notion, Drive or company websites. Website research supports public HTML/text on the supplied host, at most four pages. It cannot access private systems or interpret arbitrary conditional contracts. The prototype uses one API process and is not enterprise-scale collaboration software.

## Links and status

- Source: https://github.com/parthjaina2107/ripple-company-brain.
- Setup: [LOCAL_SETUP.md](LOCAL_SETUP.md).
- Graph model and executable query explanation: [GRAPH_MODEL.md](GRAPH_MODEL.md), [QUERIES.md](QUERIES.md).
- Verification: [VERIFICATION.md](VERIFICATION.md).
- Demo rehearsal: [DEMO.md](DEMO.md).
- Blog draft: [BLOG_POST.md](BLOG_POST.md).
- Deployment: not created. Complete local setup is supplied.
- Demo video: not recorded yet; add the actual working video URL before submission.
- Blog: written locally; add a published URL only after publishing and checking the event's submission process.

## AI assistance disclosure

Implementation and drafting used OpenAI Codex. The team must review the code, run the walkthrough, verify the results, and explain the graph, queries, policy rules and tradeoffs before submitting. This disclosure does not imply that participant understanding has been verified. Complete [JUDGE_QA.md](JUDGE_QA.md) as a hands-on rehearsal.

Official requirements checked October 17, 2026: [event rules](https://www.wemakedevs.org/hackathons/falkordb/rules). Keep the actual registration, video, repository and final submission status accurate; no award outcome is promised.
