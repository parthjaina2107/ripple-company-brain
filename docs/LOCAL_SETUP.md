# Complete local setup for reviewers

Use Node.js 24 LTS and npm. Node 22.13+ is the minimum; authentication uses built-in `node:sqlite`. Python is not required. Use one API process, a persistent working directory and a live FalkorDB instance.

## 1. Get the source

```powershell
git clone https://github.com/parthjaina2107/ripple-company-brain.git
Set-Location ripple-company-brain
npm.cmd ci
if (!(Test-Path .env)) { Copy-Item .env.example .env }
```

These instructions describe the current working tree. Updates are pushed only on the owner's request. On macOS/Linux use `npm`, `cd` and `test -f .env || cp .env.example .env`. Do not overwrite an existing `.env` containing credentials.

## 2. Choose a real database

Cloud: create a FalkorDB Cloud instance and set the local `.env` to `RIPPLE_MODE=falkordb`, `FALKORDB_URL=<instance connection URL>` and `FALKORDB_GRAPH=ripple_hackathon`. Use the instance's database user/password, not your Cloud website login. Encode special characters in URL credentials. Use `rediss://` if the instance requires TLS. Do not share the URL or commit it.

Docker alternative (requires Docker Desktop/Engine):

```powershell
docker compose up -d
```

Keep the example `FALKORDB_URL=redis://127.0.0.1:6379`. Compose binds Redis and FalkorDB Browser to loopback and persists data in a named volume. Do not remove the volume to reset a demonstration. Docker was not available on the development computer; Cloud is the verified runtime.

```powershell
npm.cmd run check:db
```

Require `connected: true` and populated topic neighborhoods. This check connects to the configured graph, so it proves database access, not which mode the running API uses. Also check the UI in step 4. A newly named graph may contain only a metadata marker until the app first seeds the public demo; run this command again after startup.

## 3. Configure a live model

Set `AI_PROVIDER=gemini`, `GEMINI_API_KEY=<your key>` and `GEMINI_MODEL=gemini-3.5-flash-lite` in `.env`. Model availability and account quotas can vary. `npm run check:model` verifies extraction and supported/unsupported tool routing. There is no silent provider fallback.

`AI_PROVIDER=offline` is an explicit developer mode and is labeled in the app. It does not prove live LLM behavior. Never use a `VITE_` variable for credentials.

## 4. Start and sign in

```powershell
npm.cmd run dev
```

Open http://127.0.0.1:5173. API: http://127.0.0.1:3001. Choose the read-only Acme demo to inspect the seeded graph and verify **FalkorDB connected**. For the writable walkthrough, create a Ripple account with a 12+ character password and create a company with an official public HTTPS website. You enter these credentials yourself; no shared demo password is published. A workspace starts empty.

Auth data and signing secret are stored in ignored `.data/`; graph knowledge is in FalkorDB. Keep both between restarts. Email recovery/verification and invitation delivery are not configured; this is a local prototype. Creating a company does not prove ownership of its domain.

## 5. Exercise and verify

Follow [DEMO.md](DEMO.md) for a repeatable synthetic company scenario; use [COMPANY_WORKSPACES.md](COMPANY_WORKSPACES.md) to import actual permitted public sources.

```powershell
npm.cmd test
npm.cmd run build
npm.cmd run check:research
npm.cmd run check:live
```

`check:research` fetches a real public example page and tests model extraction separately on labeled synthetic policy text. `check:live` uses the configured live model and Cloud database together: baseline → changed policy → native dependency paths → correction → export → recall through a new database connection. It removes only its own randomly named test graphs. It does not modify your company graph or create user accounts. Artifacts are written under ignored `artifacts/`.

To run the built frontend with the API, stop the development command, set `BETTER_AUTH_URL=http://127.0.0.1:3001` in `.env`, run `npm start`, and open http://127.0.0.1:3001. Switch the URL back to port 5173 before returning to Vite. Do not run two API instances against the same company graph.

## Troubleshooting

- Database unavailable: confirm Cloud is running, inspect TLS/host/port and credentials locally, restart after editing `.env`, and rerun `check:db`. There is no preview fallback.
- Port already used: stop your previous `npm run dev` process. Vite and API must agree with configured origins; use the documented ports for the simplest setup.
- Empty company: expected until evidence and policies are approved. Acme sample data is separate.
- No research findings: enter a direct public HTML policy URL containing one of the four explicit numeric policy types. Private, PDF and JavaScript-only pages are unsupported.
- No impact: confirm audience, effective/analysis date, approved status and that documents have reviewed claims connected to this policy topic.
- Request timeout: reload to check saved state before retrying a write. Model quota errors require correcting the selected provider account/configuration.
- Company changed in another tab: reload and check the company name before writing.

Do not include `.env`, `.data`, real credentials, or personal information in issue reports.
