import { test } from "node:test";
import assert from "node:assert/strict";
import { createSeed } from "../server/seed.js";
import { RippleService } from "../server/service.js";
import { buildGraphWrite, traverse, type Repository } from "../server/repository.js";
import { answerQuestion, extractClaims, discoverPublicFindings } from "../server/ai.js";
import type { GraphState, ResearchResult } from "../shared/types.js";

function memory(initial: GraphState): Repository {
  let state = structuredClone(initial);
  return { mode: "preview", read: async () => structuredClone(state), save: async (next) => { buildGraphWrite(next); state = structuredClone(next); }, paths: async (target) => traverse(state, target) };
}
test("unsupported capabilities and settlement questions never acquire duration citations", async () => {
  process.env.AI_PROVIDER = "offline";
  for (const question of ["Can trial users export data?", "Can support reset my password?", "What is our refund policy for damaged goods?", "How long does a refund take to process?", "What are cancellation fees?", "When is support open?"]) {
    assert.equal((await answerQuestion(createSeed(), question, "new", "2026-10-17")).sources.length, 0, question);
  }
  for (const text of ["New self-serve customers receive a refund within 5 days.", "New self-serve customers receive support resolution within 2 hours."]) {
    assert.equal((await extractClaims("Ambiguous policy", text)).claims.length, 0);
    assert.equal((await discoverPublicFindings([{ title: "Ambiguous policy", url: "https://example.com", text, retrievedAt: new Date().toISOString() }])).length, 0);
  }
});
test("sandbox research approval has a valid owner, creates impacts, and publishes an applied revision", async () => {
  const state = createSeed();
  const quote = "New self-serve customers have a 14-day refund window after purchase.";
  const research: ResearchResult = { id: "research-audit", website: "https://example.com", pages: [{ url: "https://example.com/policy", title: "Refund terms", text: quote, retrievedAt: new Date().toISOString() }], findings: [{ id: "finding", topic: "refund_window", value: 14, quote, sourceUrl: "https://example.com/policy", scope: "new" }], warnings: [], createdAt: new Date().toISOString() };
  state.nodes.push({ id: research.id, kind: "research", title: "Unapproved research", content: JSON.stringify(research), status: "pending" });
  const service = new RippleService(memory(state));
  const result = await service.approveResearch(research.id, [{ findingId: "finding", scope: "new" }], "2026-10-17");
  assert.equal(result.policiesCreated, 1);
  const conflict = result.analyses[0].impacts.find((i) => i.classification === "conflict")!;
  assert.ok(conflict);
  await assert.rejects(service.publish(conflict.reviewId!), /Apply a current correction/);
  await service.apply(conflict.reviewId!, "2026-10-17");
  const receipt = await service.publish(conflict.reviewId!);
  assert.match(receipt.content!, /14-day/);
  assert.equal((await service.publish(conflict.reviewId!)).id, receipt.id);
  assert.equal((await service.repo.read()).nodes.filter((n) => n.kind === "publication").length, 1);
});
