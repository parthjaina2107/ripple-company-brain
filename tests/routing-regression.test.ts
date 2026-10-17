import { test } from "node:test";
import assert from "node:assert/strict";
import { decisionIntent, decisionIssue, withDecisionValue, policies, policyTopics, topicOf } from "../shared/policies.js";
import { createSeed } from "../server/seed.js";
import { refreshSampleData } from "../server/sample-data.js";
import { addDecision, analyze, applicablePolicy, createReviews, reconcileReviews, applyCorrection } from "../server/domain.js";
import { traverse } from "../server/repository.js";
import type { DecisionInput } from "../shared/types.js";

const input: DecisionInput = { title: "Change return policy to 14 days", topic: "refund_window", value: 14, scope: "new", status: "approved", effectiveFrom: "2026-10-17", asOf: "2026-10-17" };

test("return-policy title is recognised, while a trial-targeted write is rejected before mutation", () => {
  assert.deepEqual(decisionIntent(input.title), { topics: ["refund_window"], value: 14, unit: "days" });
  const state = createSeed();
  const snapshot = JSON.stringify(state);
  assert.throws(() => addDecision(state, { ...input, topic: "trial_duration" }), /selected area is trial duration/);
  assert.equal(JSON.stringify(state), snapshot);
  assert.match(decisionIssue({ ...input, value: 7 })!, /title says 14/);
  assert.match(decisionIssue({ ...input, title: "Change trial and refund windows to 14 days" })!, /one policy area/);
  assert.match(decisionIssue({ ...input, topic: "support_response", title: "Change support response to 14 days" })!, /uses hours/);
  assert.equal(withDecisionValue("Set refund window to 14 days", "10"), "Set refund window to 10 days");
  assert.equal(withDecisionValue("Set refund window to 14 days", ""), "Set refund window to 14 days");
});

test("return changes never include trial-only guidelines, even with unrelated paths supplied", () => {
  const state = createSeed();
  const decision = addDecision(state, input);
  const mixedPaths = [...traverse(state, "topic-refund"), ...traverse(state, "topic-trial")];
  const report = analyze(state, decision, mixedPaths, input.asOf);
  assert.equal(report.impacts.filter((i) => i.classification === "conflict").length, 3);
  assert.equal(report.impacts.filter((i) => i.classification === "review").length, 2);
  assert.equal(report.impacts.filter((i) => i.classification === "unaffected").length, 1);
  assert.ok(report.impacts.every((i) => topicOf(i.artifact) === "refund_window"));
  assert.ok(!report.impacts.some((i) => ["doc-onboarding", "doc-faq", "flow-handoff"].includes(i.artifact.id)));
  assert.equal(applicablePolicy(state, "new", input.asOf, "trial_duration")?.value, 14);
});

test("superseded pending reviews leave the actionable queue and retain their history", () => {
  const state = createSeed();
  const old = addDecision(state, input);
  const report = analyze(state, old, traverse(state, "topic-refund"), input.asOf);
  createReviews(state, report);
  const oldReviewId = report.impacts.find((i) => i.classification === "conflict")!.reviewId!;
  const next = addDecision(state, { ...input, title: "Set refund window to 21 days", value: 21 });
  // Ensure version ordering also works for two decisions in the same millisecond.
  createReviews(state, analyze(state, next, traverse(state, "topic-refund"), input.asOf));
  assert.equal(state.nodes.find((n) => n.id === oldReviewId)?.status, "stale");
  assert.equal(state.nodes.filter((n) => n.kind === "review" && n.status === "pending").length, 5);
  reconcileReviews(state, "2026-10-16");
  assert.equal(state.nodes.filter((n) => n.kind === "review" && n.status === "pending").length, 5, "Looking at an earlier date must not retire later valid work");
  assert.throws(() => applyCorrection(state, oldReviewId, input.asOf), /resolved/);
});

test("legacy routing repair restores trial policy, retains invalid decision and protects corrected documents", () => {
  const state = createSeed();
  const valid = addDecision(state, { ...input, topic: "trial_duration", title: "Set trial duration to 7 days", value: 7 });
  const wrong = addDecision(state, { ...input, topic: "trial_duration", title: "Set trial duration to 14 days" });
  wrong.title = input.title; // The exact state produced by the old unvalidated form.
  const wrongPolicy = state.nodes.find((n) => n.id === wrong.policyId)!;
  wrongPolicy.title = input.title;
  const protectedDoc = state.nodes.find((n) => n.id === "doc-onboarding")!;
  protectedDoc.revision = 3;
  protectedDoc.content = "Customer reviewed custom onboarding text.";
  const marker = state.nodes.find((n) => n.id === "topic-trial")!;
  delete marker.sampleVersion;
  assert.equal(refreshSampleData(state), true);
  reconcileReviews(state, input.asOf);
  assert.equal(wrong.status, "invalid");
  assert.equal(wrongPolicy.status, "invalid");
  assert.equal(wrong.title, input.title);
  assert.equal(applicablePolicy(state, "new", input.asOf)?.id, valid.policyId);
  assert.equal(protectedDoc.content, "Customer reviewed custom onboarding text.");
  const saved = JSON.stringify(state);
  assert.equal(refreshSampleData(state), false);
  assert.equal(JSON.stringify(state), saved);
});

test("sample artifacts have distinct content and every seeded current claim remains supported", () => {
  const state = createSeed();
  const sources = state.nodes.filter((n) => ["document", "workflow", "memory"].includes(n.kind));
  assert.equal(sources.length, 28);
  assert.equal(new Set(sources.map((n) => n.title)).size, sources.length);
  assert.equal(new Set(sources.map((n) => n.content)).size, sources.length);
  for (const claim of state.nodes.filter((n) => n.kind === "claim" && n.status === "current")) {
    assert.ok(state.nodes.find((n) => n.id === claim.sourceId)?.content?.includes(claim.quote!), claim.id);
  }
  for (const topic of policyTopics) assert.ok(traverse(state, policies[topic].root).length > 0);
});
