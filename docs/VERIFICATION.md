# Verification record

## Hosted deployment and QA repair — October 17, 2026 (current)

- Deployed [Ripple on Vercel](https://ripple-company-brain.vercel.app) with FalkorDB Cloud as the knowledge store. The hosted Acme workspace is read-only, skips SQLite auth initialization and uses structured question routing without a hosted Gemini key. Local company authentication, website research and writes remain available separately.
- Live database health returned `ready: true` and `storage: falkordb`; the demo graph contained 124 nodes and 205 relationships at deployment verification.
- Fixed the full-height green banner by consolidating the hosted notice into the existing content banner. Removed the inactive hosted sign-in action. User QA confirmed layout, navigation, graph areas, filters, evidence, exports and persistence; later browser automation timed out, so the latest visual retest remains unconfirmed.
- Fixed live question requests by allowing the exact `https://ripple-company-brain.vercel.app` Origin. Post-deployment requests with that header returned HTTP 200 for trial (7 days), refund window (14 days), cancellation (30 days) and support (24 hours). An unrelated Origin still returned HTTP 403.
- Refund-processing and payment-arrival questions now return no applicable policy, with no policy sources. Regression tests also preserve valid refund eligibility questions. Knowledge searches with no matches now render an explicit empty state.
- All 37 automated tests and the TypeScript/Vite production build passed. `npm run check:companies` passed against Cloud: approval, 30-to-14-day refund change, correction, export, idempotent apply, fresh-connection recall and isolation from a second company. Its two temporary verification graphs were removed. This rerun used offline routing and does not establish a new live Gemini check or a browser signup/write walkthrough.
- Vercel sign-in protection remained enabled at the last deployment check. Judge access, the demo video, blog publication, team rehearsal and final event submission remain outstanding.

## Submission preparation — October 17, 2026 (earlier verification)

- `npm run check:db` passed against configured FalkorDB Cloud: 124 entities, 205 relationships; native paths: trial 28, refund 13, cancellation 10, support 11. Counts describe this saved demo, not every new company.
- The running browser displayed **FalkorDB connected**. Its public Acme workspace remained read-only. Applied-review Markdown export completed successfully through the live API; the UI showed an export confirmation and the source/decision/evidence packet was available.
- `npm run check:live` passed with **Gemini gemini-3.5-flash-lite and Cloud together**. Actual provider extraction from explicitly synthetic policy text → owner-approved 30-day refund baseline → 14-day change → native graph impact → applied source correction → export → 14-day recall through a new database connection. Repeated apply produced one correction record, and a second company's graph stayed empty. The two temporary graphs were removed. Fresh connection recall is a backend persistence check; it is not a claim that a browser signup/write walkthrough was automated.
- `npm run check:model` passed exact-quote extraction (five claims), supported tool routing for all four topics, and unsupported pricing handling. `npm run check:research` passed a real public HTTPS fetch plus separate provider extraction on labeled synthetic policy text.
- 37 automated tests pass. TypeScript/Vite production build passes. Export tests cover approval gating, foreign/missing review rejection, before/after evidence, digest validity, repeatability and no state mutation.
- Local setup now defaults the example environment to real FalkorDB and documents Cloud, Docker, accounts, model configuration, checks, built serving and troubleshooting. Cloud was exercised; Docker was not available on this computer.
- Entry is explicitly **Track 03 — Company Brain**. Submission copy, a blog draft, a repeatable rehearsal and team Q&A are in this repository. The model's constrained role and external publication limits are stated explicitly.
- At this earlier checkpoint, recording and deployment were pending. Deployment has since been completed as described above. Blog publication, video recording and final event submission have not been performed. Team members must personally rehearse and understand the work.

All older entries below are historical snapshots. Earlier trial-only unsupported-topic statements, test counts, seed counts and remaining-work notes should not be read as current status. Current refunds are supported; pricing is the unsupported example.

## Routing repair and distinct sample sources — October 17, 2026

- 31 automated tests pass, including the exact return-title/trial-selector regression and no-mutation validation, mixed-topic path isolation, review retirement, protection of newer reviews during historical lookup, repair of legacy wrongly routed decisions, unique sample titles/content, and compact parameterized graph writes.
- Production TypeScript/Vite build passes.
- Live API rejects a refund/return title targeted at trial duration with HTTP 400.
- Live browser saves the intended 14-day refund change and shows 3 refund conflicts, 2 billing workflow reviews, and 1 preserved enterprise source. No trial-only guidelines appear. Editing the duration clears the report and synchronises the title.
- Live Gemini extraction and read-only lookups for all four topics pass.
- Existing Cloud sample sources were upgraded after a local backup; corrected user text and decision/correction history were retained. The wrongly routed historic trial decision is marked invalid with an explanation.
- Full investigation and repair details: `ROUTING_FIX.md`.
- Found and fixed query-plan cache memory growth in the original per-node MERGE writer. Evicted only rebuildable cached plans; retained all graph records. Three live saves with the constant query preserved 124 nodes/205 relationships and the refund 3/2/1 result; memory stayed about 4.27 MB instead of exceeding the 100 MB instance limit.

## Multiple company policy areas — October 16, 2026

- Added refund windows, cancellation notice and initial support response time alongside trial duration. Existing Cloud data was upgraded additively, preserving user decisions and corrections.
- Live FalkorDB read returned all four topic roots. Native dependency queries returned paths in each of the three new neighborhoods.
- Automated checks cover topic isolation, correct hours/days, effective-date lookup, enterprise exceptions, proposed/future policies, additive upgrade idempotency, multi-topic extraction and preservation of unrelated assertions during correction.
- Browser checked the Policy area selector, support-response defaults in hours, and the new Ask Ripple question suggestions.
- Live Gemini structured extraction returned five supported claims covering all four topics and omitted the conditional statement. Live question requests subsequently hit provider high-demand/unavailability errors; the full live model check did not pass in this run. These errors surface to the user without switching providers or inventing an answer.
- Older verification entries below describe the earlier trial-only version; refund questions are now supported for the refund window. Pricing remains an unsupported-topic example.

## Verified in the development environment

- TypeScript check and Vite production build.
- Eleven domain/service tests covering expected impact counts, proposals/future policies, enterprise exceptions, history, idempotency, stale sources, superseded policies, multi-claim review, all-audience vs audience-specific policies, file persistence, ingestion and unknown-topic handling.
- Local API health and frontend return HTTP 200.
- Browser: record a policy change, inspect 5/3/2 impact counts, open correction review, apply a patch, see review status change and revision 2.
- Browser: retrieve the 7-day policy and return a missing-knowledge answer for refunds.
- Responsive layout inspected at the narrow in-app viewport and the desktop breakpoint.

## Live FalkorDB verified — October 16, 2026

- Connected successfully using the locally configured database credentials.
- Switched `RIPPLE_MODE` from preview to falkordb and restarted the development server.
- Seeded the empty Cloud graph with 26 domain entities and 36 relationships.
- Executed the server-side dependency query: 20 paths before recording changes.
- Browser-recorded an approved 7-day trial decision; live analysis produced 5 conflicts, 3 owner reviews, and 2 unaffected enterprise items.
- Browser-applied a correction to the getting started guide; revision advanced to 2 and a before/after correction record was persisted.
- Restarted the API and confirmed the source revision and correction record survived.
- Queried policy recall after restart: self-serve 7 days, enterprise 14 days, refund question returned no sources.
- Re-ran all 11 tests and the production build successfully.

## Remaining verification

- Document ingestion against the live Cloud graph (previously tested in preview).
- Full Cloud-instance shutdown has not been exercised. Client socket interruption and recovery are verified separately below.
- Hosted deployment and access checks.

## Live Gemini verified — October 16, 2026

- Configured `AI_PROVIDER=gemini` and `GEMINI_MODEL=gemini-3.5-flash-lite` using the locally saved Gemini key.
- The model catalog request authenticated successfully. Gemini 3.8 Flash returned high-demand errors; 3.5 Flash timed out on structured output. Flash-Lite was selected explicitly after successful requests, not used as a hidden runtime fallback.
- `npm run check:model` passed live structured extraction: two explicit audience-scoped claims retained with verbatim quotes; a conditional claim omitted.
- Live function calling selected `get_policy_context` for a supported trial question.
- Live function calling classified the refund question as unsupported and produced no fabricated sources.
- Browser verification against the running Cloud workspace returned the 7-day self-serve policy in model-routed mode; the expanded trace identified Gemini Flash-Lite selecting `trial_duration` before the approved-policy lookup.
- Fourteen automated tests cover the domain, persistence, provider selection, secret-safe error handling and mocked Gemini transport contracts. Mock transport tests are separate from the live checks above.
- Production build passes with the native Google GenAI SDK.

## Connection recovery verified — October 16, 2026

- Diagnosed the stuck loading screen: an unhandled FalkorDB `SocketClosedUnexpectedlyError` terminated the API while Vite remained running.
- Registered a sanitized database error listener so runtime socket interruptions no longer terminate the API. Enabled transport keep-alive/pings, bounded command waits, and rejection of disconnected writes.
- API readiness now reflects the actual database transport state; disconnected routes return a retryable error without switching to preview.
- Workspace requests time out after 15 seconds. Mutation requests have a longer budget, are never automatically retried, and tell the user to check saved state after a timeout.
- `npm run check:reconnect` passed against Cloud through a temporary loopback proxy. Dropped only the test client's socket, confirmed disconnected reads were rejected, restored the connection, and confirmed unchanged entity/relationship counts. The app's client and Cloud instance were not stopped by this fault check.
- Seventeen automated tests and the production build pass. Browser reload displays the live workspace rather than the loading screen.

## Live FalkorDB verification procedure

1. Add `FALKORDB_URL`, set `RIPPLE_MODE=falkordb`, restart the server.
2. Run `npm run check:db`; confirm connectivity and graph counts.
3. Confirm the UI says FalkorDB connected and has no preview banner.
4. Run the demo on the freshly seeded graph: 5 conflicts / 3 owner reviews / 2 unaffected items.
5. Apply one correction, restart the API, then confirm revision 2, preserved original text and 7-day policy recall.
6. Paste a new permitted document, review its claims, save, refresh analysis, and confirm its evidence path comes from FalkorDB.
7. Take the database offline and confirm operations fail visibly instead of falling back to preview.

## Live model verification procedure

1. Set `AI_PROVIDER=gemini`, `GEMINI_API_KEY` and `GEMINI_MODEL`, restart, and confirm the UI shows the configured model. OpenAI remains an explicitly selectable alternative.
2. Paste a straightforward trial claim and check exact source-quote extraction.
3. Test an ambiguous audience and a conditional statement. Reject unsupported extracted claims during review.
4. Ask supported trial-duration and unsupported refund questions, then inspect the tool trace.
5. Confirm model errors appear as errors and never perform a correction.

Do not describe the project as fully live-verified until these checks pass.
