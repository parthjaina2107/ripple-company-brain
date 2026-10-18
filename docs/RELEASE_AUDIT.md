# Submission release audit

This maps the remaining-issues audit to the October 17 release. It is evidence for a bounded hackathon demonstration, not a guarantee of defect-free software or enterprise readiness.

| Finding | Release treatment | Evidence / boundary |
|---|---|---|
| Cross-instance stale overwrites | Fixed | Single-query snapshot, atomic revision guard, changed-record upserts; two-connection Cloud regression preserves applied correction and rejects stale save with 409 |
| Missing sandbox research owner | Fixed | Import ensures the owner exists; sandbox import passes the real write validator and deployed public-research workflow |
| Unsupported questions answered by keyword | Fixed for the reproduced cases; stricter supported-intent boundary | Tests reject export capability, password reset, damaged goods and refund processing; unknown knowledge still abstains |
| Research approval skips impacts | Fixed | New imported decisions run impact/review creation; regression finds conflicting existing sources |
| Processing time misread as eligibility | Fixed for supported schema | Topic-specific meaning validation is shared by model extraction, offline extraction and research approval; ambiguous/conditional contracts remain unsupported |
| Non-atomic sandbox admission | Fixed | Count-and-reserve lease is one atomic graph query; ten active slots; explicit release frees a slot |
| Soft storage limit | Fixed | All Cloud saves validate projected entity/edge/byte budgets before writing |
| Expiry and cached clients | Mitigated | Signed access expiry, expired cache eviction, provisioning cleanup and daily namespace cleanup; physical deletion is later than access expiry |
| Rate fairness/overhead | Mitigated | Verified sandbox-session budgets, IP budgets for other callers, coarse global budgets, GET quotas and bounded pruning; external edge protection and free-instance capacity remain platform limits |
| Research timeout mismatch | Fixed for the synchronous flow | One 40-second page-download deadline, bounded provider call, enclosing request cancellation checked before save; no automatic retries after uncertain writes |
| Duplicate mutations | Mitigated | Request keys and atomic graph metadata retain latest 500 saved commands; correction and publication retries are idempotent |
| Missing actor in audit | Fixed for new hosted records | Server-derived judge/user actor, correction-export actor and explicit controlled-publishing receipt; legacy records identify missing actor |
| Conflicting default dates | Fixed | Shared workspace-date helper: visibly pinned synthetic date, current India date for company workflows |
| Whole-graph scaling | Bounded and improved | Consistent read, changed-record writes, entity/edge/byte limits; full library snapshots remain appropriate only for this bounded prototype, not unbounded enterprise datasets |
| Release checks and operations | Improved | Vercel runs tests before build, request ID/status/latency logs, real graph-read health, Cloud backup-restore rehearsal; GitHub Actions is supplied as a template because the current credential lacks workflow scope |

## Demonstration improvements shipped

- Guided five-step judge journey and an isolated writable graph without account signup.
- Hosted Gemini extraction/tool selection, server-only credentials and a shared daily provider-call budget.
- Public fictional Acme policy fixture for website research.
- Explicit publishing of applied copies to a controlled Acme help-centre surface, with revision and actor receipts.
- Updated walkthrough, presentation script, submission description, blog draft and model/query explanations.

## Features deliberately outside the submission

Real-company hosted signup/recovery/invitations/domain verification, scheduled external website drift monitoring, arbitrary contract conditions, unrestricted conversation memory and integrations that edit unrelated company websites/Slack/Notion/Drive are not implemented. Company account/membership functionality remains available locally. The public sandbox exposes the full implemented synthetic policy workflow; the submission should describe that scope accurately.

The [demo video link](https://drive.google.com/file/d/1rE86BOqE2P8hofZ_Y7SbMzFHWnYHpw_3/view?usp=sharing) is included in the submission materials. Confirm access without sign-in; blog publication and event-portal submission still require owner action. Database/provider availability and shared hosting quotas cannot be guaranteed by application tests.
