# Policy routing and sample-data repair — October 17, 2026

## Root cause

The old Change studio treated the decision title as a label, while the policy-area selector determined the write and graph traversal. “Change return policy to 14 days” submitted with the default Trial duration selector therefore created a trial policy and correctly traversed the wrong neighborhood. The UI did not warn about that contradiction. It also retained old reports after draft edits and combined multiple generations of review tasks in one list.

## Changes

- Recognise trial, refund/return, cancellation notice and support-response intent in decision titles. A single recognised topic and explicit duration fill the fields; the preview states exactly what will be recorded.
- Reject conflicting topic, duration and unit at the domain boundary before any state mutation, including direct API requests that bypass the browser.
- Clear reports after draft edits, synchronise title numbers when the duration changes, show the saved report context, and load matching fields when reopening a decision. Prevent draft edits while a save is in progress.
- Ignore graph paths ending at a different topic root or passing through another topic's claims/policies.
- Retire pending tasks tied to a superseded policy or source revision. Keep applied and reviewed history; filter the review workspace by topic and status. Historical lookups do not retire newer valid work.
- Clear old answers after question, audience or date edits, so the previous group's answer cannot be mistaken for the new selection.
- Refresh untouched sample sources with distinct titles, purposes, source systems and owners. Add four operational examples, giving 28 documents, workflows and saved replies in a fresh workspace. Shared facts intentionally agree across sources, but the content and function of each source are distinct.
- Exclude future and invalid policies from the current graph-map selection.

## Existing data

Before an existing workspace is upgraded, a JSON snapshot is saved under ignored `.data/backups/`. Sources already revised by user corrections keep their text. An incorrectly routed historic decision is preserved with its original title and status `invalid`, rather than reinterpreted as a different policy. Its policy version is excluded from applicability and its old pending reviews become stale. Incorrect numeric titles retain `originalTitle` when relabelled to match their actual stored value.

## Verification

- Regression tests cover the exact return-title/trial-selector failure, no mutation on rejection, mixed-topic path rejection, topic-specific impact counts, superseded review retirement, protection of newer work during historical lookup, safe data repair, unique sample content, and supported claim quotes.
- Existing domain/service checks still cover corrections, multi-topic preservation, stale sources, dates, scopes, proposals, persistence, and transport error handling.
- Live browser reproduction: typing the original return-policy request selects Refund / return window and 14 days. Saving it produces 3 conflicts, 2 owner reviews and 1 unaffected enterprise source, without trial guidelines. Editing the duration clears the report and updates the title.
- Live API: a contradictory return-title/trial-topic request returns HTTP 400.
- Live Gemini structured extraction and all four read-only topic tools pass.

## Cloud memory issue found during verification

The original repository generated a different large `MERGE` chain as node/edge counts changed. These cached query plans filled the free instance's 100 MB memory limit: Redis reported 106.03 MB, while the stored graph itself was small. Read-only cache-maintenance queries evicted rebuildable plans without deleting any graph records; usage dropped to 4.07 MB. FalkorDB documents its bounded LRU query-plan cache in [GRAPH.QUERY](https://falkordb.github.io/docs-staging/commands/graph.query/).

Storage now uses one compact, constant `UNWIND` query shape with parameterized node rows and six allowlisted relationship groups. Empty groups aggregate back to one row so subsequent groups still execute. The complete upsert remains one atomic write. Existing graphs connect without a startup write; failed clients are closed, and failed API startup retries the connection automatically.

Three consecutive live impact-report saves retained 124 nodes, 205 relationships and the 3/2/1 refund result. Memory remained around 4.27 MB. A native read-only query confirmed the empty-group continuation pattern. Two additional storage regression tests bring the passing automated total to 31.

See `POLICY_AREAS.md` for the testing walkthrough. This remains a synthetic company workspace with four duration policies; no physical-return conditions or external payment/business-system execution is implemented.
