import { test } from "node:test";
import assert from "node:assert/strict";
import { createSeed, edge, expandCompanyKnowledge } from "../server/seed.js";
import { addDecision, analyze, applicablePolicy, applyCorrection, createReviews } from "../server/domain.js";
import { traverse } from "../server/repository.js";
import { answerQuestion, extractClaims } from "../server/ai.js";
import { policies, policyTopics, topicOf, validClaimQuote } from "../shared/policies.js";
import type { DecisionInput } from "../shared/types.js";

const base: DecisionInput = { title: "Company policy update", value: 14, scope: "new", status: "approved", effectiveFrom: "2026-10-16", asOf: "2026-10-16" };

test("each added topic isolates impact, preserves enterprise exceptions and supports historical recall", () => {
  const state = createSeed();
  for (const topic of policyTopics.filter((t) => t !== "trial_duration")) {
    const config = policies[topic];
    const decision = addDecision(state, { ...base, topic, value: config.suggested });
    const result = analyze(state, decision, traverse(state, config.root), base.asOf);
    assert.equal(result.impacts.filter((i) => i.classification === "conflict").length, topic === "cancellation_notice" ? 2 : 3);
    assert.equal(result.impacts.filter((i) => i.classification === "review").length, topic === "support_response" ? 1 : 2);
    assert.ok(result.impacts.every((i) => topicOf(i.artifact) === topic));
    assert.equal(applicablePolicy(state, "new", "2026-10-15", topic)?.value, config.initial);
    assert.equal(applicablePolicy(state, "new", base.asOf, topic)?.value, config.suggested);
    assert.equal(applicablePolicy(state, "enterprise", base.asOf, topic)?.value, topic === "support_response" ? 4 : 60);
    createReviews(state, result);
    const conflict = result.impacts.find((i) => i.artifact.kind === "document")!;
    applyCorrection(state, conflict.reviewId!, base.asOf);
    assert.ok(conflict.artifact.content?.includes(String(config.suggested)));
    const refreshed = analyze(state, decision, traverse(state, config.root), base.asOf);
    assert.equal(refreshed.impacts.find((i) => i.artifact.id === conflict.artifact.id)?.classification, "unaffected");
  }
  assert.equal(applicablePolicy(state, "new", base.asOf)?.value, 14);
});

test("multi-topic source correction preserves unrelated assertions and their evidence", () => {
  const state = createSeed();
  const source = state.nodes.find((n) => n.id === "doc-refund_window-new")!;
  const supportQuote = "New self-serve customers receive an initial support response within 24 hours.";
  source.content += ` ${supportQuote}`;
  state.nodes.push({ id: "mixed-support-claim", kind: "claim", topic: "support_response", title: "Support claim", value: 24, scope: "new", sourceId: source.id, quote: supportQuote, status: "current" });
  state.edges.push(edge(source.id, "mixed-support-claim", "ASSERTS"), edge("mixed-support-claim", "topic-support", "DEPENDS_ON"));
  const decision = addDecision(state, { ...base, topic: "refund_window" });
  const result = analyze(state, decision, traverse(state, "topic-refund"), base.asOf);
  createReviews(state, result);
  applyCorrection(state, result.impacts.find((i) => i.artifact.id === source.id)!.reviewId!, base.asOf);
  assert.match(source.content!, /14-day refund/);
  assert.ok(source.content!.includes(supportQuote));
  assert.equal(state.nodes.find((n) => n.id === "mixed-support-claim")?.status, "current");
  assert.ok(state.edges.find((e) => e.source === source.id && e.target === "mixed-support-claim")?.active);
  const refundClaim = state.nodes.find((n) => n.sourceId === source.id && n.kind === "claim" && n.topic === "refund_window" && n.status === "current")!;
  assert.equal(refundClaim.quote?.includes(supportQuote), false);
});

test("new policy topics respect proposed and future statuses", () => {
  for (const changes of [{ status: "proposed" as const }, { effectiveFrom: "2026-10-18" }]) {
    const state = createSeed();
    const decision = addDecision(state, { ...base, topic: "refund_window", ...changes });
    const result = analyze(state, decision, traverse(state, "topic-refund"), base.asOf);
    createReviews(state, result);
    assert.equal(applicablePolicy(state, "new", base.asOf, "refund_window")?.value, 30);
    assert.equal(state.nodes.filter((n) => n.kind === "review").length, 0);
  }
});

test("company knowledge upgrade is additive, idempotent and keeps existing decisions", () => {
  const state = createSeed();
  state.nodes = state.nodes.filter((n) => !n.topic);
  const retainedIds = new Set(state.nodes.map((n) => n.id));
  state.edges = state.edges.filter((e) => retainedIds.has(e.source) && retainedIds.has(e.target));
  const decision = addDecision(state, { ...base, value: 10 });
  const before = JSON.stringify(state.nodes);
  const originals = [...state.nodes];
  assert.equal(expandCompanyKnowledge(state), true);
  assert.equal(JSON.stringify(originals), before);
  assert.ok(state.nodes.includes(decision));
  const upgraded = JSON.stringify(state);
  assert.equal(expandCompanyKnowledge(state), false);
  assert.equal(JSON.stringify(state), upgraded);
  assert.equal(applicablePolicy(state, "new", base.asOf)?.value, 10);
});

test("all topics extract with their own units and answer from their own policy", async () => {
  const previous = process.env.AI_PROVIDER;
  process.env.AI_PROVIDER = "offline";
  try {
    const content = "New self-serve customers receive a 14-day trial. New self-serve customers have a 30-day refund window after purchase. New self-serve customers must give 30 days of cancellation notice before renewal. New self-serve customers receive an initial support response within 24 hours.";
    const extraction = await extractClaims("Handbook", content);
    assert.deepEqual(extraction.claims.map(topicOf), [...policyTopics]);
    for (const topic of policyTopics) {
      const answer = await answerQuestion(createSeed(), policies[topic].question, "new", base.asOf);
      assert.equal(topicOf(answer.sources[0]), topic);
      assert.equal(answer.sources[0].value, policies[topic].initial);
      assert.equal(answer.paths[0].ids.at(-1), policies[topic].root);
    }
    for (const question of ["What does it cost?", "What is our refund processing time?", "How long does a refund take to process?", "When will my refund arrive?", "When will the refund be credited to my bank?", "How long until I receive my refund?", "What is the trial and refund window?"]) {
      assert.equal((await answerQuestion(createSeed(), question, "new", base.asOf)).sources.length, 0);
    }
    for (const question of ["How long does our refund window last?", "How many days after purchase can I request a refund?", "What is our return policy?"]) {
      assert.equal(topicOf((await answerQuestion(createSeed(), question, "new", base.asOf)).sources[0]), "refund_window");
    }
    assert.equal(validClaimQuote({ topic: "support_response", value: 24, scope: "new", quote: "New self-serve customers receive an initial support response within 24 days." }, "New self-serve customers receive an initial support response within 24 days."), false);
    assert.equal(validClaimQuote({ topic: "refund_window", value: 30, scope: "enterprise", quote: "New self-serve customers have a 30-day refund window." }, "New self-serve customers have a 30-day refund window."), false);
  } finally {
    if (previous === undefined) delete process.env.AI_PROVIDER; else process.env.AI_PROVIDER = previous;
  }
});
