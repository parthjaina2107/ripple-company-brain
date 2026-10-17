# Judge Q&A and team rehearsal

Read the referenced implementation, then explain these in your own words. This guide does not replace understanding or prove team contribution.

## What problem needs a graph?

A policy change can affect a guide directly and a workflow indirectly through that guide. A text match finds repeated numbers; it does not establish those dependencies, preserve historical versions or distinguish a downstream process from a direct assertion. Ripple stores native relationships and obtains paths from FalkorDB. A relational implementation is possible, but this implementation uses graph traversal for its central impact workflow.

## What does the traversal do?

See `FalkorRepository.paths` in `server/repository.ts` and [QUERIES.md](QUERIES.md). Starting from any entity, it follows one to six outgoing `ASSERTS` or `DEPENDS_ON` edges to a selected topic. All edges must be active. It returns node IDs and relationship types. Domain code filters artifact kinds and classifies applicable claims. Six hops bound the small prototype; large graphs need more selective queries and pagination.

## Why DEPENDS_ON?

`document → ASSERTS → claim` says what a source asserts. `claim → DEPENDS_ON → policy version → DEPENDS_ON → topic` ties that assertion to policy context across versions. `workflow → DEPENDS_ON → document` identifies indirect operational impact. `OWNED_BY` is separate and is not traversed as evidence of a contradiction. A dependency does not authorize replacing workflow behavior.

## How is the correct policy chosen?

Read `applicablePolicy` in `server/domain.ts`. It considers topic, approved status, customer scope, effective date and version ordering. Proposals and future policies are excluded for current lookup. Audience exceptions survive changes outside their scope. The LLM does not decide which policy wins. Historical lookup is effective-date based, not full bitemporal reconstruction.

## What is the LLM doing?

Read `discoverPublicFindings`, `extractClaims` and `answerQuestion` in `server/ai.ts`. It extracts candidate numeric claims with exact source quotes and routes a question to the supported `get_policy_context` tool. The server validates structured output, topic, unit and quoted evidence. Final authoritative numbers are rendered from approved graph records. The agent does not generate arbitrary Cypher, autonomously approve policies, or invent external changes. This is a constrained assistant workflow, not a general autonomous research agent.

The hosted showcase uses live Gemini for extraction and supported question routing, with a shared daily allowance. Unsupported intent is rejected before provider calls. Refund processing and payment-arrival questions abstain because an eligibility window does not describe when money arrives. The authoritative value always comes from approved graph records, even when the model selects the tool.

## How does idempotency work?

`createReviews` uses a stable ID built from decision and artifact IDs, so reanalysis does not append duplicate tasks. `applyCorrection` returns an already applied review before creating another correction. State writes are serialized within one API process, and entity/edge IDs are upserted with `MERGE` in one parameterized query. Research approval rejects a previously imported snapshot and reuses matching source content. A newly submitted decision is a new command; duplicate decision submissions are not globally deduplicated. Do not automatically retry ambiguous writes or claim distributed exactly-once execution.

## What prevents a stale correction?

The server rechecks the applicable policy, pending review status, source revision/content and whether the source was replaced or archived. It marks superseded pending reviews stale. Old assertions and before/after correction records remain for audit. Applied-review export represents that historical correction; the owner must check the current external revision before publishing it.

## Where is memory stored?

Policies, decisions, saved source/memory artifacts and correction history persist in FalkorDB. Fresh-session answers retrieve approved context rather than relying on the current chat transcript. Ripple is not recording arbitrary episodic conversation history or coordinating autonomous agents. Authentication is stored separately in SQLite and is not a second knowledge database.

## How are companies isolated?

Better Auth validates the session and organization membership. The server derives the graph name from the organization ID. Owners/admins can write; members can read and ask. The browser's expected company ID must match the session company, protecting against stale tabs after a company switch. Hashing graph names is not the security boundary; membership checks are. Domain ownership is self-declared and not verified.

## What does “gets work done” mean here?

Ripple writes approved repairs into its stored source, updates the claim graph, preserves history and exports Markdown/JSON for an owner to use. Export includes the source, policy, decision, path and corrected content digest. It does not edit external systems. A checksum detects content equality; it does not authenticate an approver or constitute a digital signature.

## What broke during development?

A return-policy title was previously paired with a trial selector, causing unrelated results. Title/topic/value validation and topic-isolation regressions now cover it. The old writer generated wider query text as records grew, filling a small Cloud instance's plan cache. A constant `UNWIND` query fixed that growth. These are concrete engineering lessons; avoid claiming unmeasured speedups.

## Rehearse without reading answers

1. Draw a source/claim/policy/topic path and an indirect workflow path.
2. Locate and explain the actual Cypher and one safe `MERGE` write.
3. Run `npm run check:live`, then explain why 30 becomes 14 and what fresh-connection recall proves.
4. Demonstrate an enterprise exception, a future policy and a missing-knowledge answer.
5. Apply a correction twice and explain why only one record exists.
6. Export an applied correction and explain what still needs an owner action.
7. State one meaningful contribution and one tradeoff each team member personally understands. Do not invent contributions.
