# Ripple

**When a policy changes, how many documents silently become wrong?** Ripple follows dependencies in FalkorDB, prepares evidence-backed corrections, and lets an owner approve, export and publish repaired copies to a controlled demo help centre.

See [the company policy guide](docs/POLICY_AREAS.md) for trial, refund, cancellation and support examples and a step-by-step walkthrough.

For company login and official website research, start with [Company workspaces](docs/COMPANY_WORKSPACES.md).

Built for **Graph Hacks: Context for AI Agents**, October 15–18, 2026. Declared submission track: **Track 03 — Company Brain**.

**Hosted demo:** [Open Ripple](https://ripple-company-brain.vercel.app). Click **Try your own sandbox** for the guided question → change → review → publish → question flow in your own FalkorDB Cloud graph. Hosted Gemini extracts candidate claims and selects a read-only graph tool; approved graph values determine the answer. Follow the [judge walkthrough](docs/JUDGE_SANDBOX.md).

Start with [complete local setup](docs/LOCAL_SETUP.md), [the repeatable demo](docs/DEMO.md), [submission description](docs/SUBMISSION.md), [blog draft](docs/BLOG_POST.md), and [judge Q&A](docs/JUDGE_QA.md). A narrated walkthrough and a shorter submission edit have been produced locally. The public video link is intentionally omitted from this repository update.

See [the submission checklist](docs/SUBMISSION_CHECKLIST.md) for completed checks and remaining owner actions.

Use [the presentation script](docs/PRESENTATION.md) for the demo narrative and accurate feature boundaries.

See [security controls and verification](docs/SECURITY.md) for response headers, origin restrictions, signed sandbox sessions, server validation and shared FalkorDB rate limits.

## Submission at a glance

Prepared against the [official Graph Hacks rules](https://www.wemakedevs.org/hackathons/falkordb/rules), checked October 18, 2026. See the [detailed requirements map](docs/SUBMISSION_REQUIREMENTS.md).

| Requirement | Where to find it |
|---|---|
| Public source repository | [ripple-company-brain](https://github.com/parthjaina2107/ripple-company-brain) |
| README setup instructions | [Run locally](#run-locally), [complete reviewer setup](docs/LOCAL_SETUP.md), [.env.example](.env.example) |
| Graph data model | [Model below](#graph-data-model), [full model and versioning](docs/GRAPH_MODEL.md) |
| Dependent Cypher queries / algorithms | [Core query below](#core-cypher-query), [query explanations](docs/QUERIES.md), [executable repository queries](server/repository.ts), [policy and impact logic](server/domain.ts) |
| Live deployment | [Open Ripple](https://ripple-company-brain.vercel.app) — no account needed for a judge sandbox |
| Declared track | **Track 03 — Company Brain** |
| AI coding-assistant disclosure | [Disclosure below](#ai-assistance-disclosure) |
| Demo video | Produced locally; public link intentionally omitted here and still required in the final event submission |

This repository is not confirmation of registration or final event submission. The team should be able to explain the graph model, queries, architecture and technical decisions; [judge Q&A](docs/JUDGE_QA.md) and [the presentation script](docs/PRESENTATION.md) cover those details.

## Try the complete workflow

1. Open the live deployment and click **Try your own sandbox**. A fresh sandbox uses fictional Acme data in its own FalkorDB graph.
2. Ask `What is our refund window?` for **New self-serve**, as of **2026-10-17**: **30 days**.
3. In **Change studio**, record an approved **14-day refund window** for New self-serve, effective and analyzed as of **2026-10-17**.
4. Inspect the confirmed conflicts, workflow reviews and unaffected enterprise exception. Open an evidence path.
5. Apply one confirmed correction in **Review queue**, then explicitly publish it from **Acme website**. Inspect the revised customer copy and receipt. Markdown/JSON exports are available on applied reviews.
6. Ask again: **14 days**. Refresh and repeat. Enterprise remains **60 days**; the self-serve policy on **2026-10-01** remains **30 days**.

The policy decision changes the authoritative answer; applying and publishing repair downstream copies. Try **Policy research** with the prefilled [fictional public policy page](https://ripple-company-brain.vercel.app/acme-policies.html), or add a document in **Knowledge library**. Follow [the full judge walkthrough](docs/JUDGE_SANDBOX.md) for these additional features and resource limits.

## Data provenance

The public tour, sandbox seed and Acme policy page are synthetic demonstration data, maintained in [server/seed.ts](server/seed.ts), [server/sample-data.ts](server/sample-data.ts) and [public/acme-policies.html](public/acme-policies.html). Website research is limited to permitted public HTTPS HTML/text. Research findings remain pending until explicitly reviewed and approved. No private, personal, login-protected or paywalled records should be imported into the graph.

## What is implemented

- A responsive React workspace with overview, knowledge map, change studio, knowledge library, review queue, decision history, and policy Q&A.
- Email/password sessions, company membership and separate company graphs. Owners/admins can write; members can read and ask questions.
- Bounded research of a supplied public HTTPS website, with exact quotes, source links and explicit human approval before importing policy baselines.
- Versioned trial duration, refund window, cancellation notice, and initial support response policies, with approval status, audience and effective date.
- Multi-hop dependency discovery using `ASSERTS` and `DEPENDS_ON` relationships.
- Three outcomes: **confirmed contradiction**, **owner review required**, and **unaffected**.
- Reviewed, targeted text corrections; original content, claim versions and correction history are preserved.
- Download approved corrections as Markdown or JSON, including before/after text, policy provenance, evidence paths, actor and a content checksum. Explicitly publish applied copies to the controlled Acme sandbox site with a revision-checked receipt.
- Stale revision / superseded-policy protection and idempotent apply operations.
- Pasted-document claim extraction, explicit user review and graph ingestion.
- Persistent policy lookup in a fresh session, with source references and tool traces.
- Native Gemini structured extraction and read-only function calling, with optional OpenAI support. Model text proposes and routes; deterministic policy checks and human approval govern writes.

The shared Acme tour contains **fictional** data and is read-only. **Judge sandboxes** are writable copies in separate Cloud graphs with signed visitor sessions, two-hour expiry and resource limits. Run locally for real company login and membership management. Signed-in company workspaces start empty, with separate policy graphs and real session/membership checks. Creating a workspace does not verify ownership of a company or website.

## Run locally

Requires Node.js 22.13 or newer (Node 24 recommended for built-in SQLite). This project uses TypeScript on both frontend and backend, so Python is not required.

```powershell
git clone https://github.com/parthjaina2107/ripple-company-brain.git
Set-Location ripple-company-brain
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

On macOS/Linux, use `cd ripple-company-brain`, `npm` instead of `npm.cmd`, and `test -f .env || cp .env.example .env`.

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

Use a hosted judge sandbox or a signed-in local company workspace. The shared Acme tour is read-only; the visitor's separate sandbox supports changes, research, ingestion, reviews, correction exports and controlled publishing.

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
    → RippleService (policy applicability, analysis and approval workflow)
      → deterministic policy rules + narrowly scoped model tools
      → FalkorRepository → native FalkorDB nodes / typed edges / Cypher paths
        → consistent snapshots + atomic revision-guarded saves
```

See [graph model](docs/GRAPH_MODEL.md), [queries](docs/QUERIES.md), [verification](docs/VERIFICATION.md), and [demo script](docs/DEMO.md).

In FalkorDB mode all authoritative entities, relationships, decisions, claims and review history live in FalkorDB. Dependency discovery runs there, returning concrete path IDs and relationship types. Removing FalkorDB prevents workspace retrieval, analysis, corrections and recall. The preview repository is a separate, openly labeled development simulator, not a production fallback.

## Graph data model

Domain records use native `Entity` nodes with stable IDs, queryable `kind` and typed JSON payloads. Relationships are native graph edges with an `active` flag preserving current versus historical links.

| Node kinds | Role |
|---|---|
| `policy`, `decision` | Topic anchors and approved/proposed versions with audience and effective date |
| `document`, `claim` | Source text, exact reviewed assertions and source revisions |
| `workflow`, `memory` | Dependent processes and saved agent replies |
| `owner`, `review`, `correction` | Responsibility, proposed work and preserved repair history |
| `research`, `publication` | Public-source snapshots and controlled publishing receipts |

```mermaid
graph LR
  D[Decision] -->|CREATES| P[Policy version]
  P -->|SUPERSEDES| O[Previous policy]
  P -->|DEPENDS_ON| T[Policy topic]
  O -->|DEPENDS_ON| T
  A[Document or saved reply] -->|ASSERTS| C[Reviewed claim]
  C -->|DEPENDS_ON| O
  W[Workflow] -->|DEPENDS_ON| A
  A -->|OWNED_BY| R[Owner]
  D -->|CREATES| Q[Review]
  Q -->|REPAIRS| A
  U[Publication receipt] -->|DEPENDS_ON| A
```

The graph discovers candidate impacts. Deterministic server logic separately selects authority by topic, approval status, audience, effective date and version order. It distinguishes an explicit conflicting claim from a workflow requiring review. See [the full model](docs/GRAPH_MODEL.md) for correction lifecycle and workspace isolation.

## Core Cypher query

This actual query discovers dependent sources and returns their evidence paths:

```cypher
MATCH p=(a:Entity)-[:DEPENDS_ON|ASSERTS*1..6]->(topic:Entity {id: $target})
WHERE all(r IN relationships(p) WHERE r.active = true)
RETURN [n IN nodes(p) | n.id] AS ids,
       [r IN relationships(p) | type(r)] AS relations
```

For the refund demonstration, `target = 'topic-refund'`. The same query supports `topic-trial`, `topic-cancellation` and `topic-support`. [server/repository.ts](server/repository.ts) contains the executable query and atomic persistence implementation; [server/domain.ts](server/domain.ts) contains applicability, classification and correction validation. [QUERIES.md](docs/QUERIES.md) explains the snapshot/read and guarded-write queries. No model-generated Cypher or decorative graph is used.

## Verification

```powershell
npm.cmd test
npm.cmd run build
npm.cmd run check:db
npm.cmd run check:live
npm.cmd run check:judge
npm.cmd run check:concurrency
```

Behavior tests cover applicability, exceptions, multi-hop discovery, corrections, idempotency, stale sources, persistence, ingestion and missing knowledge. These simulator/domain tests **do not prove the Cloud connection or live model calls work**. Use the live verification checklist after adding credentials.

Build and serve the local production bundle:

```powershell
npm.cmd run build
npm.cmd start
```

Open http://127.0.0.1:3001. FalkorDB saves enforce an atomic workspace revision precondition; a stale request returns 409 instead of restoring old text. Reads use one consistent snapshot and saves update only changed records. The [Vercel demo](https://ripple-company-brain.vercel.app) serves the frontend and Express API functions with FalkorDB Cloud as the knowledge database. `RIPPLE_SHARE_DEMO=true` disables company-account initialization; `VITE_SHARE_DEMO=true` opens the shared tour. `RIPPLE_SANDBOX_SECRET` authorizes isolated judge writes. Secrets stay server-side. Real hosted company accounts require durable authentication storage, trusted origins, email verification and recovery; those account services remain outside the public judge demo.

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

The locally produced demonstration uses synthetic English narration and edited captures of the working app. No team-member contribution or technical understanding is inferred from the use of these tools.
