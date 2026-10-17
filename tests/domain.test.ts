import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addDecision,
  analyze,
  applicablePolicy,
  applyCorrection,
  createReviews,
  reconcileReviews,
} from "../server/domain.js";
import { createSeed, edge } from "../server/seed.js";
import { traverse } from "../server/repository.js";
import type { DecisionInput } from "../shared/types.js";

const input: DecisionInput = {
  title: "Shorten self-serve trial",
  value: 7,
  scope: "new",
  effectiveFrom: "2026-10-16",
  asOf: "2026-10-16",
  status: "approved",
};
function scenario(overrides: Partial<DecisionInput> = {}) {
  const state = createSeed();
  const decision = addDecision(state, { ...input, ...overrides });
  const result = analyze(
    state,
    decision,
    traverse(state, "topic-trial"),
    input.asOf,
  );
  createReviews(state, result);
  return { state, decision, result };
}
test("approved change finds 5 direct contradictions, 3 indirect workflows, and preserves 2 enterprise items", () => {
  const { state, result } = scenario();
  assert.equal(
    result.impacts.filter((i) => i.classification === "conflict").length,
    5,
  );
  assert.equal(
    result.impacts.filter((i) => i.classification === "review").length,
    3,
  );
  assert.equal(
    result.impacts.filter((i) => i.classification === "unaffected").length,
    2,
  );
  const flow = result.impacts.find((i) => i.artifact.id === "flow-reminder")!;
  assert.equal(flow.classification, "review");
  assert.ok(flow.path.ids.length >= 4);
  assert.equal(state.nodes.filter((n) => n.kind === "review").length, 8);
  assert.ok(
    result.impacts
      .filter((i) => i.artifact.scope === "enterprise")
      .every((i) => !i.reviewId),
  );
});
test("proposed and future policies do not override current knowledge", () => {
  for (const override of [
    { status: "proposed" as const },
    { effectiveFrom: "2026-10-18" },
  ]) {
    const { state, result } = scenario(override);
    assert.equal(applicablePolicy(state, "new", input.asOf)?.value, 14);
    assert.ok(result.notice);
    assert.ok(result.impacts.every((i) => i.classification === "unaffected"));
    assert.equal(state.nodes.filter((n) => n.kind === "review").length, 0);
  }
});
test("correction preserves original evidence, updates claim links, and is idempotent", () => {
  const { state, result } = scenario();
  const impact = result.impacts.find(
    (i) => i.artifact.id === "doc-onboarding",
  )!;
  const old = impact.artifact.content;
  applyCorrection(state, impact.reviewId!, input.asOf);
  assert.match(impact.artifact.content!, /7-day/);
  assert.equal(impact.artifact.revision, 2);
  assert.equal(state.nodes.find((n) => n.kind === "correction")?.original, old);
  assert.equal(
    state.nodes.find((n) => n.id === "doc-onboarding-claim")?.status,
    "superseded",
  );
  applyCorrection(state, impact.reviewId!, input.asOf);
  assert.equal(state.nodes.filter((n) => n.kind === "correction").length, 1);
  const updated = analyze(
    state,
    result.decision,
    traverse(state, "topic-trial"),
    input.asOf,
  );
  assert.equal(
    updated.impacts.find((i) => i.artifact.id === "doc-onboarding")
      ?.classification,
    "unaffected",
  );
});
test("workflow dependencies never receive text patches based on downstream claims", () => {
  const { state, result } = scenario();
  const item = result.impacts.find((i) => i.artifact.id === "flow-reminder")!;
  const review = state.nodes.find((n) => n.id === item.reviewId)!;
  assert.equal(review.proposed, undefined);
  assert.throws(
    () => applyCorrection(state, review.id, input.asOf),
    /human review/,
  );
});
test("stale source revisions and superseded policy versions block applying an old patch", () => {
  const a = scenario();
  const item = a.result.impacts.find((i) => i.artifact.id === "doc-support")!;
  item.artifact.revision = 2;
  assert.throws(
    () => applyCorrection(a.state, item.reviewId!, input.asOf),
    /source has changed/,
  );
  const b = scenario();
  const oldReview = b.result.impacts.find(
    (i) => i.artifact.id === "doc-support",
  )!.reviewId!;
  addDecision(b.state, { ...input, value: 10, effectiveFrom: "2026-10-17" });
  assert.throws(
    () => applyCorrection(b.state, oldReview, "2026-10-17"),
    /applicability has changed/,
  );
});

test("replaced website sources retire their pending reviews and reject old corrections", () => {
  const { state, result } = scenario();
  const item = result.impacts.find((impact) => impact.artifact.id === "doc-support")!;
  item.artifact.status = "superseded";
  assert.throws(() => applyCorrection(state, item.reviewId!, input.asOf), /source has been replaced/);
  reconcileReviews(state, input.asOf);
  assert.equal(state.nodes.find((node) => node.id === item.reviewId)?.status, "stale");
});
test("historical lookups use effective dates and enterprise exceptions survive self-serve changes", () => {
  const { state } = scenario();
  assert.equal(applicablePolicy(state, "new", "2026-10-15")?.value, 14);
  assert.equal(applicablePolicy(state, "new", "2026-10-16")?.value, 7);
  assert.equal(applicablePolicy(state, "enterprise", "2026-10-16")?.value, 14);
});
test("multiple direct claims require owner review rather than choosing a convenient one", () => {
  const { state, decision } = scenario();
  state.nodes.push({
    id: "extra-claim",
    kind: "claim",
    title: "Another claim",
    value: 21,
    scope: "new",
    sourceId: "doc-faq",
    quote: "21 days",
    status: "current",
  });
  state.edges.push(
    edge("doc-faq", "extra-claim", "ASSERTS"),
    edge("extra-claim", "topic-trial", "DEPENDS_ON"),
  );
  const result = analyze(
    state,
    decision,
    traverse(state, "topic-trial"),
    input.asOf,
  );
  assert.equal(
    result.impacts.find((i) => i.artifact.id === "doc-faq")?.classification,
    "review",
  );
});
test("duplicate analyses do not create duplicate review tasks", () => {
  const { state, result } = scenario();
  createReviews(state, result);
  createReviews(state, result);
  assert.equal(state.nodes.filter((n) => n.kind === "review").length, 8);
});
test("an older all-customer change does not override a later audience-specific decision", () => {
  const state = createSeed();
  const general = addDecision(state, { ...input, scope: "all", value: 10 });
  addDecision(state, { ...input, value: 7, effectiveFrom: "2026-10-17" });
  const result = analyze(
    state,
    general,
    traverse(state, "topic-trial"),
    "2026-10-18",
  );
  assert.equal(
    result.impacts.find((i) => i.artifact.id === "doc-support")?.classification,
    "unaffected",
  );
  assert.equal(
    result.impacts.find((i) => i.artifact.id === "doc-enterprise")
      ?.classification,
    "conflict",
  );
});
