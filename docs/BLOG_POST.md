# A policy changed. Which company documents just became wrong?

*Ripple: building a company knowledge maintenance assistant with FalkorDB for Graph Hacks 2026.*

Publication status: draft in the repository. Review this article, add your own observations and publish it before supplying a blog URL to the event. No author identity, fabricated team contributions or unpublished URL is inserted here.

## The copies outlive the decision

Imagine a company reducing its refund window from 30 days to 14. Updating the approved policy is easy. Finding every place that repeats the old promise is harder: a billing guide, an onboarding checklist, a saved assistant answer, perhaps a workflow that sends that guide to customers.

A search for “30 days” helps, but it cannot tell us whether the phrase describes refunds, cancellation notice or an enterprise exception. It also misses a workflow that depends on the guide without repeating its number.

That is the problem behind Ripple. The aim is to turn one policy decision into a reviewable set of knowledge maintenance tasks, with a reason for every result.

## Model the assertion, then its dependencies

Ripple stores documents, reviewed claims, policy versions, decisions, owners and review tasks in FalkorDB. Its core path looks like this:

```text
Workflow → DEPENDS_ON → Document → ASSERTS → Claim
Claim → DEPENDS_ON → Policy version → DEPENDS_ON → Policy topic
Document → OWNED_BY → Owner
```

Claims matter because a document can discuss more than one policy. A refund change should not rewrite a trial statement simply because both appear on the same page.

The topic node links policy versions into one neighborhood. That lets a traversal find an old claim even after multiple newer decisions exist. Native graph edges carry these relationships; the canvas is a view of the graph, not the storage mechanism.

The impact query follows active `ASSERTS` and `DEPENDS_ON` relationships for up to six hops and returns node IDs and edge types. Those paths become inspectable evidence. Ownership edges help route work but do not establish that a source contradicts a policy.

## An edge is evidence of dependence, not evidence of error

Once FalkorDB discovers a source, Ripple checks which approved policy applies to its topic, customer audience and date. Proposed changes and policies that are not yet effective do not replace current knowledge. A self-serve refund change does not erase an enterprise exception.

The result has three categories. A direct, reviewed numeric claim can be a confirmed conflict. An indirectly connected workflow needs an owner review. A source outside the affected scope can remain unchanged.

This distinction is deliberate. A workflow depending on a guide does not tell us enough to invent a replacement workflow. Ripple records a work item rather than pretending it knows the operational consequence.

## Give the model a bounded job

The current prototype supports four numeric duration policies: trial length, refund window, cancellation notice and initial support response time. Gemini extracts candidate claims with exact source quotations and routes questions to a supported read-only policy-context tool. The application validates the output and renders authoritative values from approved graph records.

Company workspaces can research a supplied public HTTPS page and up to three relevant links on the same host. Findings stay pending until an owner checks the quote, audience and effective date. Public text is evidence, not an instruction to the agent. Missing or unsupported information remains missing.

This is a constrained agent workflow. It does not claim open-ended autonomous research, private company access or arbitrary contract interpretation. The small policy domain makes it possible to inspect the decision boundary and test failure cases rather than hiding them behind fluent text.

## Finish a repair and hand it off

For a safe text correction, Ripple compares the current source revision and applicable policy with the review's evidence. After approval it updates the stored copy, increments its revision, retires the old assertion and preserves before/after history. Reapplying an already applied review returns the existing result instead of creating another correction.

An applied correction can now be downloaded as Markdown or JSON. The packet includes the source, original and corrected text, approved policy, decision, evidence path and a SHA-256 content digest. A document owner can use it to update the actual external source. The digest checks content equality; it is not a signature. Downloading a packet does not publish a website or edit a Drive document.

## Verify the story with real infrastructure

The live verification on October 17 used FalkorDB Cloud and Gemini together. A clearly labeled synthetic refund source established a 30-day baseline. A 14-day decision exposed a conflicting source through native graph paths. Approval repaired the stored text and produced an export. Repeated application left one correction record. Opening a new database connection still returned the approved 14-day policy, while a second company stayed empty.

There is an important distinction in that story: the approved decision changes the policy answer. Applying a correction repairs the stale document. We do not imply that fixing a document is what makes the new policy authoritative.

The repository also contains tests for effective dates, audience exceptions, stale reviews, topic routing, duplicate operations, auth membership and company isolation. The preview simulator is useful for development, but it is not evidence of a qualifying database-backed submission. Live checks are separate and explicit.

## Two failures that improved the design

An earlier title/selector mismatch routed a return-policy request into the trial neighborhood. The fix validates the policy area, title, numeric value and unit before a write, and adds regression tests for unrelated results. This was a reminder that interface ambiguity can undermine otherwise correct graph traversal.

Another failure came from query construction. Generating larger query text as the graph grew consumed a small Cloud instance's query-plan cache. The writer now uses a constant-shaped parameterized `UNWIND` query with allowed relationship groups. We retained the graph records and changed the write shape; we do not claim a general performance benchmark from that fix.

## What remains

Ripple is a local prototype with one API process. It needs production email/account recovery, stronger operational controls and more selective queries before larger deployments. Public research does not render JavaScript-only pages or read PDFs. The policy model needs richer handling before expanding into conditional rules. External publishing remains a future integration.

The useful result today is concrete: a policy decision becomes a set of traceable repairs, rather than a new answer surrounded by old company knowledge.

Source and setup: [Ripple on GitHub](https://github.com/parthjaina2107/ripple-company-brain), [local setup](LOCAL_SETUP.md), [queries](QUERIES.md), [verification](VERIFICATION.md). For an external blog platform, replace relative documentation links with their actual GitHub paths after pushing the current changes. The [official Graph Hacks page](https://www.wemakedevs.org/hackathons/falkordb) describes the event and blog side prize.

**AI assistance disclosure:** OpenAI Codex assisted with implementation and drafting. Participants remain responsible for reviewing, testing, understanding and explaining the submitted work. Add only team contributions and observations that you can substantiate.
