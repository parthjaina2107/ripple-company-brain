# Submission handoff

Current declared track: **Track 03 — Company Brain**. This is a readiness record, not confirmation that an entry was submitted.

| Item | Status | Evidence / next action |
|---|---|---|
| Live FalkorDB as primary knowledge store | Verified | `check:db`; running UI shows FalkorDB connected |
| Live model + Cloud change/repair/recall | Verified | `check:live`; [machine-readable record](verification/live-2026-10-17.json) |
| Automated checks and build | Passed | 39 tests; TypeScript/Vite production build |
| Useful output beyond internal review | Implemented | Review queue → Applied → Markdown/JSON correction export |
| Complete local setup | Written | [LOCAL_SETUP.md](LOCAL_SETUP.md); Cloud exercised, Docker instructions not exercised on this computer |
| Graph model and actual query explanation | Updated | [GRAPH_MODEL.md](GRAPH_MODEL.md), [QUERIES.md](QUERIES.md) |
| Submission description | Written | [SUBMISSION.md](SUBMISSION.md) |
| Blog post | Draft written, not published | [BLOG_POST.md](BLOG_POST.md); review, publish, add actual URL |
| Team technical understanding | Requires team rehearsal | [JUDGE_QA.md](JUDGE_QA.md); each person must explain their work |
| Demo video | Not recorded | Follow [DEMO.md](DEMO.md); record and add the actual working URL before submission |
| Deployment | Live tour and writable judge sandboxes | [Acme demo](https://ripple-company-brain.vercel.app); native FalkorDB Cloud, structured routing, no hosted Gemini key |
| Judge access | Public HTTP access verified | Unauthenticated requests to the production page and health endpoint returned HTTP 200 without redirects |
| Hosted QA fixes | Deployed and API-verified | Exact site Origin accepted; other origins rejected; refund-processing questions return no applicable policy; library has an empty-search state |
| Interactive judge sandbox | Implemented and Cloud HTTP-verified | [JUDGE_SANDBOX.md](JUDGE_SANDBOX.md); signed sessions, separate visitor graphs, change/correction/export/resume; no Ripple account needed |
| Judge browser walkthrough | Passed | Started sandbox, recorded 14-day refund decision, saw native impacts, applied correction, asked again and received 14 days |
| Latest code/docs package | Included in this update | Code, docs and tests are bundled; `.env`, `.data` and private artifacts are excluded |
| Registration and event submission | Not verified/performed | Check the event portal and supply final links before the deadline |

When a GitHub push is requested, include the corresponding README, model/query notes, tests and verification updates with the implementation. Keep commits meaningful, preserve the configured privacy-safe author identity, and never add credentials, auth databases, signing secrets or private company exports. Do not describe a local draft as published.

Checked against the [official rules](https://www.wemakedevs.org/hackathons/falkordb/rules) on October 17, 2026. A demo video is part of the submission requirements; deferring recording does not satisfy that requirement. A live deployment is preferred, with complete local setup accepted as the alternative.
