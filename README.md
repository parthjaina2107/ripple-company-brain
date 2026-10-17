# Ripple

**A company knowledge change-and-repair assistant.** Record an approved policy change, trace the documents, workflows and saved answers that depend on it, and review corrections with evidence.

See [the company policy guide](docs/POLICY_AREAS.md) for trial, refund, cancellation and support examples and a step-by-step walkthrough.

Built for **Graph Hacks: Context for AI Agents**, October 15–18, 2026. Primary track: **Company Brain**. Secondary track: **Agents That Act on Connected Data**, once live FalkorDB and model-backed behavior are verified.

## What is implemented

- A responsive React workspace with overview, knowledge map, change studio, knowledge library, review queue, decision history, and policy Q&A.
- Versioned trial duration, refund window, cancellation notice, and initial support response policies, with approval status, audience and effective date.
- Multi-hop dependency discovery using `ASSERTS` and `DEPENDS_ON` relationships.
- Three outcomes: **confirmed contradiction**, **owner review required**, and **unaffected**.
- Reviewed, targeted text corrections; original content, claim versions and correction history are preserved.
- Stale revision / superseded-policy protection and idempotent apply operations.
- Pasted-document claim extraction, explicit user review and graph ingestion.
- Persistent policy lookup in a fresh session, with source references and tool traces.
- Optional OpenAI structured extraction and read-only function calling. No model-generated Cypher or unreviewed model writes.

All company data and owner roles are **fictional**. The initial demo date is **2026-10-16** and is editable. Approval controls simulate an authorized company user; there is no identity/role authentication in this local prototype.

## Run locally

Requires Node.js 22 or newer. This project uses TypeScript on both frontend and backend, so Python is not required.

```powershell
npm.cmd install
Copy-Item .env.example .env
npm.cmd run dev
```

Open **http://127.0.0.1:5173**. The API runs at **http://127.0.0.1:3001**.

On macOS/Linux, use `npm` instead of `npm.cmd`, and `cp .env.example .env`.

The default `RIPPLE_MODE=preview` provides an explicitly labeled local simulator persisted in `.data/preview.json`. This enables UI development without a database or model key. **Preview mode is not the FalkorDB-backed hackathon submission.** It does not silently replace FalkorDB if a configured cloud connection fails.

### Connect FalkorDB Cloud

Create a dedicated database instance in FalkorDB Cloud, copy its connection details into the local `.env`, and set:

```dotenv
RIPPLE_MODE=falkordb
FALKORDB_URL=rediss://default:URL_ENCODED_PASSWORD@YOUR_HOST:YOUR_PORT
FALKORDB_GRAPH=ripple_hackathon
```

Use the protocol, username, port and TLS setting specified by your actual instance. `redis://`, `rediss://`, `falkor://` and `falkors://` URLs are accepted by the client. Encode special characters in the username/password before constructing the URL. Never commit or paste credentials into a public issue or chat.

Restart `npm run dev`. The dedicated graph is seeded on its first empty startup. The UI must show **FalkorDB connected** and the preview banner must disappear.

```powershell
npm.cmd run check:db
```

This prints only connection status and graph counts. Preview and Cloud are separate workspaces: preview edits are not automatically migrated. A Cloud connection failure produces an unavailable state, not a preview fallback.

Runtime connection errors are handled without crashing the API; the database client reconnects. Workspace requests have a 15-second timeout with a Retry connection action. Writes are not automatically retried after an ambiguous timeout. `npm run check:reconnect` verifies socket recovery using an isolated test client through a local proxy (non-TLS instances only), without changing domain data or stopping the Cloud instance.

### Or use Docker

```powershell
docker compose up -d
```

Then set `RIPPLE_MODE=falkordb` and `FALKORDB_URL=redis://127.0.0.1:6379`, and restart the API. FalkorDB Browser is available on **http://127.0.0.1:3000**. The Compose ports bind to loopback and a named volume persists graph data.

### Enable the model

Gemini is the current selected provider. Set server-side values in `.env`:

```dotenv
AI_PROVIDER=gemini
GEMINI_API_KEY=YOUR_KEY
GEMINI_MODEL=gemini-3.5-flash-lite
```

With a key, document extraction uses structured outputs and question handling uses a read-only function call to `get_policy_context`. The final authoritative values and source references are rendered deterministically from approved graph data. Run `npm run check:model` to test extraction, supported tool selection and unknown-topic handling against the actual provider.

For OpenAI, set `AI_PROVIDER=openai`, `OPENAI_API_KEY` and `OPENAI_MODEL`. To explicitly use the offline development behavior, set `AI_PROVIDER=offline`. If `AI_PROVIDER` is blank, a configured Gemini key is preferred, then OpenAI, then offline. A failed selected provider is never silently replaced by another account or an offline result. The UI and execution trace identify the selected provider and model. All keys remain server-side.

Without a key, the app explicitly shows **structured lookup mode** and uses a pattern extractor for explicit numeric claims in the four supported policy areas. This mode is not presented as live LLM inference. It skips ambiguous audiences, negative statements and conditional claims. Review extracted claims even when a model is enabled. Model failures surface as errors; they do not trigger a silent offline fallback.

## Demo walkthrough

1. Open **Change studio**. Keep the prefilled 7-day, approved, new-self-serve policy and both dates at October 16, 2026.
2. Click **Record & analyze change**. On a fresh seed, expect **5 conflicts**, **3 owner reviews**, and **2 unaffected enterprise items**.
3. Open an enterprise result: its audience differs, so the 14-day contract remains valid.
4. Open **Getting started guide → Review correction**. Inspect the stored evidence path and 14-to-7-day text comparison.
5. Click **Approve & apply correction**. The source moves to revision 2; its old claim and the original text remain in history.
6. Open **Ask Ripple**, ask about the self-serve trial: the applicable policy says 7 days. Switch the audience to Enterprise: it says 14 days.
7. Refresh the browser, open Ask Ripple again and repeat. The decision comes from persisted storage, not chat state.
8. Ask “What is our refund window?” to retrieve its separate policy. Ask “What is our pricing policy?” for a missing-knowledge response.
9. In **Knowledge library**, add a fictional document with an explicit old trial claim. Extract, review and save the claim. Open the existing decision from the log and refresh analysis: the new source is included.
10. Optional: record a proposed change or a future effective date. It does not override the currently approved policy.

The development preview may already contain decisions created during QA. A fresh Cloud graph starts from the original fixture.

## Architecture

```text
React / Vite
  → Express JSON API (loopback by default)
    → RippleService (serialized single-process reads/writes)
      → deterministic policy rules + narrowly scoped model tools
      → FalkorRepository → real FalkorDB nodes / typed edges / Cypher paths
```

See [graph model](docs/GRAPH_MODEL.md), [queries](docs/QUERIES.md), [verification](docs/VERIFICATION.md), and [demo script](docs/DEMO.md).

In FalkorDB mode all authoritative entities, relationships, decisions, claims and review history live in FalkorDB. Dependency discovery runs there, returning concrete path IDs and relationship types. Removing FalkorDB prevents workspace retrieval, analysis, corrections and recall. The preview repository is a separate, openly labeled development simulator, not a production fallback.

## Verification

```powershell
npm.cmd test
npm.cmd run build
```

Behavior tests cover applicability, exceptions, multi-hop discovery, corrections, idempotency, stale sources, persistence, ingestion and missing knowledge. These simulator/domain tests **do not prove the Cloud connection or live model calls work**. Use the live verification checklist after adding credentials.

Build and serve the local production bundle:

```powershell
npm.cmd run build
npm.cmd start
```

Open http://127.0.0.1:3001. This is a local prototype, not an internet-ready authenticated deployment. Run one API process per workspace; do not scale replicas against this graph without a shared concurrency strategy. For hosted use, deploy the Node process on a host with TCP access to FalkorDB, add authentication and authorization, configure `HOST`, `PORT` and `APP_ORIGIN`, and keep secrets server-side. No public deployment has been created by this repository.

## Deliberate limits

- Four numeric duration policies are supported: trial duration (days), refund window after purchase (days), cancellation notice before renewal (days), and initial support response time (hours). Pricing, detailed refund eligibility conditions, cancellation fees and support resolution guarantees are not modeled.
- A source with multiple claims for the same topic or multiple audiences requires owner review; no automatic patch is proposed. Corrections to one topic preserve assertions for other topics in the same source.
- Workflow reviews record a human finding; they do not execute or rewrite external business systems.
- Document changes happen inside Ripple, not in Slack, Notion, email or Google Drive.
- Historical lookup is effective-date based. Full bitemporal “what did we know at the time?” reconstruction is not implemented.
- A bounded six-hop traversal and whole-workspace reads suit the small demo dataset, not enterprise-scale graphs.
- A stale review is blocked at apply time. Refresh analysis or analyze the latest decision before acting.

## AI assistance disclosure

This project was implemented with assistance from OpenAI Codex. Participants must review, test, understand and explain the graph model, policy logic, queries, architecture and original hackathon contributions before submitting. Include this disclosure in the final submission and credit external dependencies.
