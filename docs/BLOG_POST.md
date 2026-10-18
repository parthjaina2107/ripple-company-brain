# A policy changed. Which company documents just became wrong?

*Building Ripple, a graph-powered company brain with FalkorDB and Gemini for Graph Hacks 2026.*

Last updated: October 18, 2026. Publication status: repository draft; an external article has not been published.

[Try the working prototype](https://ripple-company-brain.vercel.app) · [Explore the source](https://github.com/parthjaina2107/ripple-company-brain)

## The copies outlive the decision

Imagine a company reducing its refund window from 30 days to 14. Updating the approved policy is easy. Finding every place that repeats the old promise is harder: a billing guide, an onboarding checklist, a saved assistant answer, perhaps a workflow that sends that guide to customers.

A search for “30 days” helps, but it cannot tell us whether the phrase describes refunds, cancellation notice or an enterprise exception. It also misses a workflow that depends on the guide without repeating its number.

That is the problem behind Ripple. One policy decision becomes a reviewable set of knowledge maintenance tasks, with a reason for every result. An owner can approve a repair, export it and explicitly publish a corrected copy to our controlled demonstration help centre. The project enters **Track 03 — Company Brain**. All Acme company records in the public demo are fictional.

## Model the assertion, then its dependencies

FalkorDB is Ripple's primary database for company knowledge: documents, reviewed claims, policy versions, decisions, workflows, saved agent replies, owners, reviews, corrections, research snapshots and publication receipts. Domain records use native `Entity` nodes with stable IDs, a queryable `kind` and typed JSON payloads. Its core paths look like this:

```text
Workflow → DEPENDS_ON → Document → ASSERTS → Claim
Claim → DEPENDS_ON → Policy version → DEPENDS_ON → Policy topic
Document → OWNED_BY → Owner
Decision → CREATES → Review → REPAIRS → Document
Publication receipt → DEPENDS_ON → Document
```

Claims matter because a document can discuss more than one policy. A refund change should not rewrite a trial statement simply because both appear on the same page.

The topic node links policy versions into one neighborhood. That lets a traversal find an old claim even after multiple newer decisions exist. Native graph edges carry these relationships; the canvas is a view of the graph, not the storage mechanism.

The actual impact query follows active `ASSERTS` and `DEPENDS_ON` relationships for up to six hops:

```cypher
MATCH p=(a:Entity)-[:DEPENDS_ON|ASSERTS*1..6]->(topic:Entity {id: $target})
WHERE all(r IN relationships(p) WHERE r.active = true)
RETURN [n IN nodes(p) | n.id] AS ids,
       [r IN relationships(p) | type(r)] AS relations
```

For a refund change, `target` is `topic-refund`. Trial duration, cancellation notice and support response time have separate topic anchors. Returned node IDs and edge types become inspectable evidence paths. Parameters carry IDs and user data; the model does not generate Cypher. Ownership edges help route work but do not establish that a source contradicts a policy.

Removing FalkorDB disables knowledge retrieval, dependency analysis, repairs and persistent recall. SQLite is limited to local authentication records. An explicitly labeled development simulator is separate from the submitted Cloud-backed runtime.

## An edge is evidence of dependence, not evidence of error

Once FalkorDB discovers a source, Ripple checks which approved policy applies to its topic, customer audience and date. Proposed changes and policies that are not yet effective do not replace current knowledge. A self-serve refund change does not erase an enterprise exception.

The result has three categories. A direct, reviewed numeric claim can be a confirmed conflict. An indirectly connected workflow needs an owner review. A source outside the affected scope can remain unchanged.

This distinction is deliberate. A workflow depending on a guide does not tell us enough to invent a replacement workflow. Ripple records a work item rather than pretending it knows the operational consequence.

## Give the model a bounded job

The current prototype supports four numeric duration policies: trial length in days, refund eligibility window in days, cancellation notice before renewal in days, and initial support response time in hours. Gemini extracts candidate claims with exact source quotations and routes questions to a supported read-only policy-context tool. The application validates the output and renders authoritative values from approved graph records.

Company workspaces and writable judge sandboxes can research a supplied public HTTPS HTML/text page and up to three relevant links on the same host. Findings stay pending until an owner checks the quote, audience and effective date. Approved findings establish versioned policies and source relationships; importing a changed policy can create impact reviews. Users can also paste a document, extract candidate claims, review them and save the source in the knowledge library. Public text is evidence, not an instruction to the agent.

The meaning of the question matters. “How long does a refund take to process?” asks about settlement time, not the refund eligibility window. Ripple rejects unsupported meanings instead of returning a familiar number merely because the question contains “refund.” Missing information remains missing.

This is a constrained agent workflow. It does not claim open-ended autonomous research, private company access or arbitrary contract interpretation. The small policy domain makes it possible to inspect the decision boundary and test failure cases rather than hiding them behind fluent text.

## Finish a repair and hand it off

For a safe text correction, Ripple compares the current source revision and applicable policy with the review's evidence. After approval it updates the stored copy, increments its revision, retires the old assertion and preserves before/after history. Reapplying an already applied review returns the existing result instead of creating another correction.

An applied correction can be downloaded as Markdown or JSON. The packet includes the source, before/after revisions and content, approved policy, decision, evidence path, actor, approval context and a SHA-256 content digest. A document owner can use it for an external handoff. The digest checks content equality; it is not a signature. Downloading a packet does not publish a website or edit a Drive document.

Publishing is a separate explicit action in **Acme website**. It checks that the applied correction still matches the current source, then creates a publication receipt linked to that source. The controlled customer help centre displays the corrected copy, source revision, publication time and actor. This updates the sandbox publishing surface; it does not edit an unrelated company's website or change the fixed public research fixture.

## Follow the complete change in the deployed app

The shared tour is read-only. **Try your own sandbox** opens a separate writable FalkorDB graph with a signed visitor session, without requiring an account. The guide lets a judge perform the complete synthetic workflow:

1. Ask the refund window for **New self-serve**, as of **October 17, 2026**. A fresh sandbox returns **30 days**, with approved policy evidence.
2. Record an approved **14-day** refund window for that group, effective and analyzed on October 17.
3. Inspect the impact report. The fresh seeded scenario exposes three conflicting sources, two workflow reviews and one unaffected enterprise source. Counts depend on the workspace's saved data.
4. Open the billing help-centre review. Compare its original 30-day wording with the proposed 14-day correction, inspect the graph path and approve the repair.
5. Download its correction packet, then open **Acme website** and click **Publish approved copy**. Inspect the revised customer copy and publication receipt.
6. Ask the same question again: **14 days**. Reload the browser and repeat: **14 days**. Enterprise remains **60 days**; the self-serve answer on **October 1** remains **30 days**.

## Keep concurrent requests from undoing a repair

An in-process queue is insufficient when two hosted server instances can write to the same graph. Ripple reads entities, relationships and workspace metadata in one consistent query. Its atomic save checks the revision before updating native records:

```cypher
MERGE (m:RippleMeta {id: 'workspace'})
WITH m WHERE coalesce(m.revision, 0) = $expected
SET m.revision = $expected + 1, m.token = $token, m.commands = $commands
```

The complete query carries the guard through each node/edge write group. A stale request returns HTTP 409 instead of restoring old source text. Command keys prevent duplicate saved mutations. The writer validates the complete projected graph and saves only changed records. Corrections also check source revisions and the applicable policy before changing text.

## Verify the story with real infrastructure

The live verification on October 17 used FalkorDB Cloud and Gemini together. A clearly labeled synthetic refund source established a 30-day baseline. A 14-day decision exposed a conflicting source through native graph paths. Approval repaired the stored text and produced an export. Repeated application left one correction record. Opening a new database connection still returned the approved 14-day policy, while a second company stayed empty.

There is an important distinction in that story: the approved decision changes the policy answer. Applying a correction repairs the stale document. We do not imply that fixing a document is what makes the new policy authoritative.

The release verification record documents **44 passing automated tests** and the TypeScript/Vite production build. Separate Cloud checks exercise the real HTTP adapter, visitor isolation, correction integrity, exports, publication and session resume. Two independent database connections verify stale-save rejection, command deduplication, capacity limits and backup restoration. Live Gemini checks cover extraction and routing across all four supported topics.

The October 18 browser walkthrough additionally exercised the deployed site's 30-to-14-day refund change, evidence review, approved correction, downloaded packet, controlled publication, recall after refresh, enterprise exception and historical answer. These checks are not a guarantee that hosting, database or provider services will never fail.

The preview simulator is useful for development, but it is not evidence of a qualifying database-backed submission. Live checks are separate and explicit. See the [verification record](https://github.com/parthjaina2107/ripple-company-brain/blob/main/docs/VERIFICATION.md).

## Two failures that improved the design

An earlier title/selector mismatch routed a return-policy request into the trial neighborhood. The fix validates the policy area, title, numeric value and unit before a write, and adds regression tests for unrelated results. This was a reminder that interface ambiguity can undermine otherwise correct graph traversal.

Another failure came from query construction. Generating larger query text as the graph grew consumed a small Cloud instance's query-plan cache. The writer now uses a constant-shaped parameterized `UNWIND` query with allowed relationship groups. We retained the graph records and changed the write shape; we do not claim a general performance benchmark from that fix.

## Bound the public prototype and name what remains

Judge sessions expire after two hours. Admission limits, graph-size limits, shared rate counters and a daily AI allowance bound public use. Expired access and physical graph cleanup are separate; cleanup runs on provisioning and through a scheduled job. Resource and provider failures surface as errors instead of invented answers or a silent switch from FalkorDB to preview data.

Ripple demonstrates persistent policy and decision context, rather than unrestricted conversation memory. Its bounded traversal and whole-workspace reads suit a hackathon dataset, not an enterprise-scale claim. Research does not support PDFs, JavaScript-only pages or arbitrary conditional contracts. Slack, Notion, Drive and arbitrary external-site publishing remain outside the implemented scope.

Company login and membership checks are available locally. Durable hosted company accounts, domain ownership verification, email recovery and invitation delivery require further work; public judges use isolated synthetic sandboxes. Possible next steps include reviewed external publishing adapters and scheduled source-drift detection.

The useful result today is concrete: a policy decision becomes a set of traceable repairs, rather than a new answer surrounded by old company knowledge.

## Try it and inspect the implementation

- [Live Ripple prototype](https://ripple-company-brain.vercel.app) — choose **Try your own sandbox**.
- [Public source repository](https://github.com/parthjaina2107/ripple-company-brain).
- [Complete local setup](https://github.com/parthjaina2107/ripple-company-brain/blob/main/docs/LOCAL_SETUP.md).
- [Graph model](https://github.com/parthjaina2107/ripple-company-brain/blob/main/docs/GRAPH_MODEL.md), [query explanations](https://github.com/parthjaina2107/ripple-company-brain/blob/main/docs/QUERIES.md) and [executable queries](https://github.com/parthjaina2107/ripple-company-brain/blob/main/server/repository.ts).
- [Judge walkthrough](https://github.com/parthjaina2107/ripple-company-brain/blob/main/docs/JUDGE_SANDBOX.md) and [security boundaries](https://github.com/parthjaina2107/ripple-company-brain/blob/main/docs/SECURITY.md).

**AI assistance:** OpenAI Codex assisted with implementation, debugging, testing and documentation.
