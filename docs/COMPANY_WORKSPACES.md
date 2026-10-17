# Company login and public policy research

## Try the complete flow

1. Run `npm run dev` and open http://127.0.0.1:5173. Refresh if the old workspace is still open.
2. Choose **Create account**. Enter your email and a password of at least 12 characters. This creates a local Ripple account, not an account with the company whose website you research.
3. Enter a company name and its official public HTTPS website URL. Create the workspace. New companies have no Acme sample policies or documents.
4. In **Policy research**, enter the website's policy page directly when possible. Click **Research website**. Ripple reads that page and up to three relevant links on the same website (with or without `www`). It stores a dated snapshot and proposed findings.
5. Inspect each source, exact quote and numeric value. Select only findings that correctly describe the company. Choose the customer audience where the website did not state it, and set the effective date yourself. A crawl date is not an effective date.
6. Approve the selections. Ripple creates approved policy versions and connected source documents inside this company graph. Conflicting values for the same policy/audience must be reconciled before approval. Reimporting the same source does not duplicate the document.
7. Open **Ask Ripple**, select the same audience and a date on/after the policy's effective date, and ask about the imported policy. Inspect the trace and sources.
8. Open **Change studio**. Choose the matching policy area, audience, approved status and effective date. Enter a different value and a matching title, such as `Set refund window to 14 days`. Record and analyze it.
9. Review the affected source and its evidence path. Approve a suggested correction if appropriate. The correction changes Ripple's stored copy; it does not edit the external website. The original version and audit history remain available.
10. Refresh and ask again: the approved policy persists. Sign out, create a separate test account/company, and verify that its workspace starts empty and cannot see the first company's sources. Use the company switcher to move between companies you belong to.

## Boundaries

- Supported findings are numeric trial duration, refund window after purchase, cancellation notice before renewal (days), and initial support response time (hours). Conditional policies, detailed eligibility, prices and arbitrary company rules need a richer model.
- Only public HTML/plain text is supported. Research cannot sign into company systems, render JavaScript-only pages, read PDFs or access private documents. Enter a direct relevant policy URL if the homepage does not link to one of the supported topics. No findings is a valid result.
- The model receives public page text as untrusted evidence. Exact source quotations and units are validated. Unapproved findings never become authoritative answers. Research snapshots expire for approval after 24 hours; rerun research if necessary.
- Fetches require HTTPS, stay on the supplied host (plus `www`), and block private/local IPs, unsafe redirects and credential-bearing URLs. Each page has a timeout and size limit. This is a user-triggered scan, not continuous monitoring.
- Company naming and website entry are self-declared; they do not establish domain ownership. There is no private company access or independent verification of legal correctness. Human review determines the approved baseline.
- Acme is a separate public, read-only fictional demo. Private APIs require a session and company membership; writes require owner/admin membership. There is no invitation UI yet.

## Storage and deployment

The [hosted Acme demo](https://ripple-company-brain.vercel.app) uses live FalkorDB Cloud. The shared tour is read-only, while **Try your own sandbox** provisions a separate writable graph with a signed visitor session. See [JUDGE_SANDBOX.md](JUDGE_SANDBOX.md) for limits and the full test flow. Company-account authentication is disabled on Vercel, and hosted routing/extraction is structured without a Gemini key. Run locally for real company accounts and memberships. Verify Vercel visitor access before sharing.

In FalkorDB mode each organization has a graph name derived from its server-validated organization ID, never from a client-supplied graph name. Graph IDs are a naming convention; session and membership checks enforce access. Source snapshots, policies, decisions, evidence and reviews live in that graph. Preview mode uses separate local JSON files and is explicitly labeled as a simulator.

Better Auth stores accounts, password hashes, memberships and sessions in ignored `.data/auth.sqlite`. A signing secret is generated locally in `.data/auth-secret` unless `BETTER_AUTH_SECRET` is supplied. Both need secure persistence and backup. Production requires a stable secret and correctly configured HTTPS origins (`BETTER_AUTH_URL`, `APP_ORIGIN`), plus email verification/recovery, invitation delivery and deployment hardening. Those production services have not been configured. Never publish `.env` or `.data`.

## Verification

Run `npm test` for auth sessions, cross-company denial, graph isolation, pending research, exact-quote extraction, conflicting findings, duplicate imports and change/correction behavior. Run `npm run build` for TypeScript and production assets. Run `npm run check:research` for a live public HTTPS fetch and provider extraction against clearly labeled synthetic policy text. The latter does not import invented facts into a company graph. Run `npm run check:companies` to verify separate native FalkorDB graphs, research approval, a refund change, correction, recall and graph paths; it creates and removes only its own nonce-named synthetic test graphs.

Requests carry the company ID displayed by the browser and must match the active session company. If another tab switches company, a stale tab receives a reload prompt instead of performing a write against a company its screen does not show.
