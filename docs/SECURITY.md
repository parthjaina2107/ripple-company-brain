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

- `npm test`: 42 tests, including header parity between CDN configuration and Express, origin rejection, rate-limit 429/retry headers, failure-closed behavior, session tampering/expiry/namespace checks and company authorization.
- `npm run build`: TypeScript and Vite production build.
- `npm run check:judge`: actual Vercel HTTP adapter against Cloud, two visitor sessions, direct invalid writes/private website rejection, change/correction/export/recall and isolation. Only temporary verification graphs are removed.
- `npm run check:rate`: concurrent atomic Cloud counters through two connections, identity separation and window expiry. The temporary security graph is removed.

## Remaining boundaries

These application budgets are not a replacement for edge DDoS protection or distributed global sandbox quotas. Prototype sandbox provisioning/size limits and per-instance service queues do not establish enterprise concurrency guarantees. Judge sandboxes are for synthetic public demonstration data and expire; do not use them for private company records. No independent penetration test or comprehensive dependency audit is claimed.
