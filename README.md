# Ripple

**When a policy changes, how many documents silently become wrong?** Ripple follows the dependencies in FalkorDB, prepares evidence-backed corrections and exports the approved work for the document owner.

See [the company policy guide](docs/POLICY_AREAS.md) for trial, refund, cancellation and support examples and a step-by-step walkthrough.

For company login and official website research, start with [Company workspaces](docs/COMPANY_WORKSPACES.md).

Built for **Graph Hacks: Context for AI Agents**, October 15–18, 2026. Declared submission track: **Track 03 — Company Brain**.

**Hosted demo:** [Open Ripple](https://ripple-company-brain.vercel.app). Explore the shared Acme tour, then click **Try your own sandbox** to change policies, apply corrections and ask again in an isolated FalkorDB Cloud graph. Follow the [judge walkthrough](docs/JUDGE_SANDBOX.md). The hosted deployment uses structured question routing; Gemini is available in the configured local workflow. Confirm Vercel access before sharing with judges.

Start with [complete local setup](docs/LOCAL_SETUP.md), [the repeatable demo](docs/DEMO.md), [submission description](docs/SUBMISSION.md), [blog draft](docs/BLOG_POST.md), and [judge Q&A](docs/JUDGE_QA.md). The demo video still needs to be recorded and linked before submission.

See [the submission checklist](docs/SUBMISSION_CHECKLIST.md) for completed checks and remaining owner actions.

See [security controls and verification](docs/SECURITY.md) for response headers, origin restrictions, signed sandbox sessions, server validation and shared FalkorDB rate limits.

## What is implemented

- A responsive React workspace with overview, knowledge map, change studio, knowledge library, review queue, decision history, and policy Q&A.
- Email/password sessions, company membership and separate company graphs. Owners/admins can write; members can read and ask questions.
- Bounded research of a supplied public HTTPS website, with exact quotes, source links and explicit human approval before importing policy baselines.
- Versioned trial duration, refund window, cancellation notice, and initial support response policies, with approval status, audience and effective date.
- Multi-hop dependency discovery using `ASSERTS` and `DEPENDS_ON` relationships.
- Three outcomes: **confirmed contradiction**, **owner review required**, and **unaffected**.
- Reviewed, targeted text corrections; original content, claim versions and correction history are preserved.
- Download approved corrections as Markdown or JSON, including before/after text, policy provenance, evidence paths and a content checksum. External publication remains an owner action.
- Stale revision / superseded-policy protection and idempotent apply operations.
- Pasted-document claim extraction, explicit user review and graph ingestion.
- Persistent policy lookup in a fresh session, with source references and tool traces.
- Native Gemini structured extraction and read-only function calling, with optional OpenAI support. Model text proposes and routes; deterministic policy checks and human approval govern writes.

The shared Acme tour contains **fictional** data and is read-only. **Judge sandboxes** are writable copies in separate Cloud graphs with signed visitor sessions, two-hour expiry and resource limits. Run locally for real company login and membership management. Signed-in company workspaces start empty, with separate policy graphs and real session/membership checks. Creating a workspace does not verify ownership of a company or website.

## Run locally

Requires Node.js 22.13 or newer (Node 24 recommended for built-in SQLite). This project uses TypeScript on both frontend and backend, so Python is not required.

```powershell
npm.cmd ci
# New checkout only: keep an existing configured .env.
if (!(Test-Path .env)) { Copy-Item .env.example .env }
# Configure FalkorDB Cloud in .env, or run Docker first:
# docker compose up -d
npm.cmd run check:db
npm.cmd run dev
```

Open **http://127.0.0.1:5173**. The API runs at **http://127.0.0.1:3001**.

Create an account, then a company workspace with its official HTTPS website. Open **Policy research**, review findings and approve the relevant baseline policies. Auth sessions and password hashes are stored in ignored `.data/auth.sqlite`; a local signing secret is generated in `.data/auth-secret`. Never commit either file. Set `BETTER_AUTH_URL` and `BETTER_AUTH_SECRET` explicitly for production, and persist this directory securely. Email verification, recovery and invitation delivery are not configured.

On macOS/Linux, use `npm` instead of `npm.cmd`, and `cp .env.example .env`.

The example environment defaults to live FalkorDB on local Docker. Use your Cloud URL instead if Docker is unavailable. Optional `RIPPLE_MODE=preview` provides an explicitly labeled development simulator persisted in `.data/preview.json`. **Preview mode is not the FalkorDB-backed hackathon submission.** It never silently replaces a failed Cloud connection.

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

## Change workflow

Use a signed-in company workspace. Acme supports public browsing, Q&A and applied-correction exports; its mutation controls are disabled.

1. Establish an approved baseline through reviewed public website findings or a manually recorded decision, and ingest documents with reviewed claims.
2. Ask the current policy for a specific audience/date, then record a different approved policy in Change studio.
3. Inspect the graph paths, direct conflicts, indirect workflow reviews and preserved audience exceptions.
4. Approve a safe correction, inspect the source revision and history, then export its Markdown/JSON packet from Review queue with the Applied filter.
5. Ask again and refresh the browser to verify persisted policy recall. Recording the policy changes the authoritative answer; applying the correction repairs a stale source.

See [DEMO.md](docs/DEMO.md) for exact synthetic refund data and dates. Results depend on the company's sources; do not promise fixed counts on arbitrary data. Questions about unsupported pricing return missing knowledge. Proposed and future changes do not override current policies.

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
npm.cmd run check:db
npm.cmd run check:live
```

Behavior tests cover applicability, exceptions, multi-hop discovery, corrections, idempotency, stale sources, persistence, ingestion and missing knowledge. These simulator/domain tests **do not prove the Cloud connection or live model calls work**. Use the live verification checklist after adding credentials.

Build and serve the local production bundle:

```powershell
npm.cmd run build
npm.cmd start
```

Open http://127.0.0.1:3001. Run one API process for the writable prototype; do not scale writable replicas against company graphs without a shared concurrency strategy. The [Vercel demo](https://ripple-company-brain.vercel.app) serves the frontend and Express API functions with FalkorDB Cloud as the knowledge database. `RIPPLE_SHARE_DEMO=true` disables company-account initialization and authenticated company writes; `VITE_SHARE_DEMO=true` opens the shared tour. `RIPPLE_SANDBOX_SECRET` enables separately authorized judge sandbox writes. Database credentials and session-signing secrets stay in server-side Vercel secrets. Hosting real company accounts requires persistent authentication storage, trusted HTTPS origins, a stable auth secret and email verification/recovery. Sandbox writes are serialized per running instance, not globally across serverless replicas.

## Deliberate limits

- Four numeric duration policies are supported: trial duration (days), refund window after purchase (days), cancellation notice before renewal (days), and initial support response time (hours). Pricing, detailed refund eligibility conditions, cancellation fees and support resolution guarantees are not modeled.
- A source with multiple claims for the same topic or multiple audiences requires owner review; no automatic patch is proposed. Corrections to one topic preserve assertions for other topics in the same source.
- Workflow reviews record a human finding; they do not execute or rewrite external business systems.
- Document changes happen inside Ripple, not in Slack, Notion, email or Google Drive.
- Approved correction exports enable an owner handoff; downloading them does not publish an external source. The content checksum is not a digital signature.
- Historical lookup is effective-date based. Full bitemporal “what did we know at the time?” reconstruction is not implemented.
- A bounded six-hop traversal and whole-workspace reads suit the small demo dataset, not enterprise-scale graphs.
- A stale review is blocked at apply time. Refresh analysis or analyze the latest decision before acting.

## AI assistance disclosure

OpenAI Codex assisted with implementation, debugging, testing and documentation.
