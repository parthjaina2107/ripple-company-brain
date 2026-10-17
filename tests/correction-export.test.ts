import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createSeed } from "../server/seed.js";
import { addDecision, analyze, createReviews, applyCorrection } from "../server/domain.js";
import { traverse } from "../server/repository.js";
import { correctionExport } from "../server/correction-export.js";

test("correction export requires approval, preserves evidence and never mutates or publishes", () => {
  const state = createSeed();
  const company = { id: "test", name: "Synthetic company", website: "https://example.com" };
  const decision = addDecision(state, { title: "Set trial duration to 7 days", value: 7, scope: "new", status: "approved", effectiveFrom: "2026-10-17", asOf: "2026-10-17" });
  const analysis = analyze(state, decision, traverse(state, "topic-trial"), "2026-10-17"); createReviews(state, analysis);
  const reviewId = analysis.impacts.find((impact) => impact.artifact.id === "doc-onboarding")!.reviewId!;
  assert.throws(() => correctionExport(state, reviewId, company), /approved and applied/);
  assert.throws(() => correctionExport(state, "foreign-company-review", company), /not found/);
  applyCorrection(state, reviewId, "2026-10-17");
  const before = JSON.stringify(state); const exported = correctionExport(state, reviewId, company);
  assert.match(exported.packet.original, /14-day/); assert.match(exported.packet.corrected, /7-day/);
  assert.equal(exported.packet.policy.value, 7);
  assert.equal(exported.packet.source.revisionAfter, 2);
  assert.equal(exported.packet.externalPublication, false);
  assert.equal(exported.packet.contentSha256, createHash("sha256").update(exported.packet.corrected).digest("hex"));
  assert.ok(exported.packet.evidence.some((item) => item.relationshipToNext === "ASSERTS"));
  assert.match(exported.markdown, /does not publish changes/);
  assert.deepEqual(correctionExport(state, reviewId, company), exported);
  assert.equal(JSON.stringify(state), before);
});
