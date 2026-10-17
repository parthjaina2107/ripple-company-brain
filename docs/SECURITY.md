# Security review and controls

The October 17 browser security report was checked against the deployed responses and source. This document records specific controls, not a guarantee that the application has no vulnerabilities.

## Confirmed issues addressed

- Static pages and bundles inherited `Access-Control-Allow-Origin: *` from the CDN. `vercel.json` now sets the exact production origin for all responses. Express also uses an explicit origin allowlist and rejects untrusted origins before application handling. Localhost origins are allowed only outside Vercel. Wildcard CORS on public static files did not establish authenticated API data exposure; pre-fix live API checks already returned 403 to untrusted origins. CORS and iframe protection are separate controls.
- CSP restricts scripts and connections to the same origin, blocks object embedding and framing, and restricts form actions/base URLs. Google Fonts has explicit style/font sources. Inline styles remain permitted because the graph and UI use style attributes; inline scripts and `eval` are not enabled.
- `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` and a restricted `Permissions-Policy` cover static and API responses. API responses are marked `no-store`. Vercel supplies HTTPS/HSTS.
- POST abuse controls use atomic counters in a dedicated FalkorDB security graph. Every serverless instance uses the same counters. Current budgets per client IP: 30 questions/minute, 3 research/approval operations/minute, 12 sandbox starts/resumes per 10 minutes, and 60 other writes/minute. Ask routes share a budget across shared-tour and sandbox aliases. Exceeded limits return 429 with `Retry-After`; store failures return a sanitized 503 rather than disabling protection. Expired counters are pruned. Local preview has an in-process limiter; it is not described as distributed protection.
- Forwarded client identity is trusted only on Vercel, using its platform-provided `x-real-ip`; direct local hosting uses the socket peer and ignores supplied forwarding headers. See [Vercel request headers](https://vercel.com/docs/headers/request-headers). Custom reverse-proxy hosting requires a deliberate trust configuration.
- Production source maps are explicitly disabled. Client bundles remain publicly readable by design. Secrets, membership checks, graph writes, policy applicability and URL-fetch validation stay on the server; obfuscation is not an authorization boundary.

## Findings that did not match the implementation

- Ripple has real Express APIs and server-side Zod validation, including numeric ranges, topic/audience/status enums, dates and length limits. A direct invalid policy write is rejected with 400 before domain mutation.
- Public website fetches validate HTTPS, credentials, ports, host and redirects on the server, resolve/pin public DNS addresses and bound response size/time/page count. Direct local/private URL submissions are rejected even without client validation.
- The workspace switcher does not authorize graph access. Judge sandboxes use server-verified HMAC capabilities in HTTP-only cookies, with Secure on Vercel, SameSite=Strict, a dedicated path and signed two-hour expiry. Forged/missing cookies cannot access a sandbox. Public provisioning grants access only to a new synthetic sandbox, not another visitor's graph.
- Real company workspaces validate Better Auth sessions, organization membership, active-company consistency and owner/admin roles for writes. Those accounts are disabled on the hosted showcase. The local account prototype still needs production email verification/recovery and persistent auth storage before real-company hosted use.

## Verification

- `npm test`: 44 tests, including the original header/session/auth checks plus unsupported-intent, semantic extraction, sandbox research-to-impact and controlled publishing regressions.
- `npm run build`: TypeScript and Vite production build.
- `npm run check:judge`: actual Vercel HTTP adapter against Cloud, two visitor sessions, direct invalid writes/private website rejection, change/correction/export/recall and isolation. Only temporary verification graphs are removed.
- `npm run check:rate`: concurrent atomic Cloud counters through two connections, identity separation and window expiry. The temporary security graph is removed.

## Remaining boundaries

These application budgets do not replace edge DDoS protection or establish unlimited enterprise capacity. Judge sandboxes hold synthetic demonstration data, with two-hour access expiry and later scheduled physical cleanup. No independent penetration test is claimed.

## Submission hardening

- Single-query consistent snapshots and an atomic FalkorDB revision precondition prevent a stale server instance overwriting a later correction. Only changed records are upserted. Conflicts return 409 for explicit refresh/review.
- Projected entity, relationship and byte limits apply to every Cloud save, including correction and research approval. Client request keys are retained after ambiguous failures; saved commands are deduplicated in graph metadata (the latest 500 keys).
- Signed judge identities are used for sandbox budgets, with IP budgets for other callers and coarse global budgets. GET reads are limited. Expired counter pruning runs at most once per minute per warm instance, in bounded batches.
- Sandbox lease count-and-reserve occurs in one atomic query. Finish & release removes the visitor's disposable graph and frees the reservation. Cleanup is namespace-scoped, during provisioning and at 03:00 UTC daily through an authenticated Cron endpoint.
- Research uses a shared 40-second download deadline across redirects/pages, with the enclosing request cancelled before any later save. Provider requests are bounded to 30 seconds with OpenAI retries disabled. Hosted provider operations have a shared 200-call daily allowance.
- New decision/research/correction records include a server-derived actor; correction exports include it. Controlled publications preserve source revision, decision and publisher. A checksum still is not a signature.
- Request IDs, status and latency are logged without bodies, cookies, IPs or credentials. Health verifies an actual graph read. Vercel's build command runs tests before producing a deployable build. A GitHub Actions template is included in `docs/ci/verify.yml`; activating it requires a credential with workflow permission, which the existing Git credential lacks.
- `npm run check:concurrency` verifies real two-connection stale-write rejection, duplicate-command rejection, size-limit rejection and backup restoration in disposable Cloud graphs.
