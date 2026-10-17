import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PreviewRepository } from "../server/repository.js";
import { RippleService } from "../server/service.js";
import { extractClaims } from "../server/ai.js";
import { topicOf } from "../shared/policies.js";

test("refund document ingestion, analysis, correction and separate support recall persist across sessions", async () => {
  const folder = await mkdtemp(join(tmpdir(), "ripple-topics-"));
  const previous = process.env.AI_PROVIDER;
  process.env.AI_PROVIDER = "offline";
  try {
    const file = join(folder, "graph.json");
    const service = new RippleService(new PreviewRepository(file));
    const extraction = await extractClaims("Mixed customer handbook", "New self-serve customers have a 30-day refund window after purchase. New self-serve customers receive an initial support response within 24 hours.");
    assert.equal(extraction.claims.length, 2);
    const doc = await service.ingest(extraction, "owner-support");
    const result = await service.decide({ topic: "refund_window", title: "Refund window update", value: 14, scope: "new", status: "approved", effectiveFrom: "2026-10-16", asOf: "2026-10-16" });
    const item = result.impacts.find((i) => i.artifact.id === doc.id)!;
    assert.equal(item.classification, "conflict");
    await service.apply(item.reviewId!, "2026-10-16");
    const fresh = new RippleService(new PreviewRepository(file));
    assert.equal((await fresh.ask("What is our refund window?", "new", "2026-10-16")).sources[0].value, 14);
    assert.equal((await fresh.ask("How quickly does support respond?", "new", "2026-10-16")).sources[0].value, 24);
    const state = (await fresh.workspace()).graph;
    const currentClaims = state.nodes.filter((n) => n.sourceId === doc.id && n.kind === "claim" && n.status === "current");
    assert.equal(currentClaims.length, 2);
    assert.equal(currentClaims.find((c) => topicOf(c) === "refund_window")?.value, 14);
    assert.equal(currentClaims.find((c) => topicOf(c) === "support_response")?.value, 24);
    assert.match(state.nodes.find((n) => n.id === doc.id)!.content!, /14-day refund.*24 hours/);
  } finally {
    if (previous === undefined) delete process.env.AI_PROVIDER; else process.env.AI_PROVIDER = previous;
    await rm(folder, { recursive: true, force: true });
  }
});

test("decision, correction, ingestion and fresh-session recall survive reopening the repository", async () => {
  const folder = await mkdtemp(join(tmpdir(), "ripple-test-"));
  const oldKey = process.env.OPENAI_API_KEY;
  const oldProvider = process.env.AI_PROVIDER;
  process.env.AI_PROVIDER = "offline";
  delete process.env.OPENAI_API_KEY;
  try {
    const file = join(folder, "graph.json");
    const service = new RippleService(new PreviewRepository(file));
    await service.workspace();
    const analysis = await service.decide({
      title: "Trial duration update",
      value: 7,
      scope: "new",
      effectiveFrom: "2026-10-16",
      asOf: "2026-10-16",
      status: "approved",
    });
    const conflict = analysis.impacts.find(
      (i) => i.artifact.id === "doc-support",
    )!;
    await Promise.all([
      service.apply(conflict.reviewId!, "2026-10-16"),
      service.apply(conflict.reviewId!, "2026-10-16"),
    ]);
    const extraction = await extractClaims(
      "Partner guide",
      "New self-serve customers receive a 14-day trial.",
    );
    assert.equal(extraction.claims.length, 1);
    const document = await service.ingest(extraction, "owner-product");
    const updated = await service.reanalyze(analysis.decision.id, "2026-10-16");
    assert.equal(
      updated.impacts.find((i) => i.artifact.id === document.id)
        ?.classification,
      "conflict",
    );
    const fresh = new RippleService(new PreviewRepository(file));
    const answer = await fresh.ask(
      "How long is the trial?",
      "new",
      "2026-10-16",
    );
    assert.match(answer.text, /7-day/);
    assert.equal(answer.sources[0].value, 7);
    assert.equal(
      (await fresh.workspace()).graph.nodes.filter(
        (n) => n.kind === "correction",
      ).length,
      1,
    );
    const unknown = await fresh.ask(
      "What is our pricing policy?",
      "new",
      "2026-10-16",
    );
    assert.equal(unknown.sources.length, 0);
    const enterprise = await fresh.ask(
      "How long is the trial?",
      "enterprise",
      "2026-10-16",
    );
    assert.equal(enterprise.sources[0].value, 14);
  } finally {
    if (oldProvider === undefined) delete process.env.AI_PROVIDER;
    else process.env.AI_PROVIDER = oldProvider;
    if (oldKey) process.env.OPENAI_API_KEY = oldKey;
    await rm(folder, { recursive: true, force: true });
  }
});
test("offline extraction does not guess ambiguous or negative claims", async () => {
  const oldKey = process.env.OPENAI_API_KEY;
  const oldProvider = process.env.AI_PROVIDER;
  process.env.AI_PROVIDER = "offline";
  delete process.env.OPENAI_API_KEY;
  try {
    assert.equal(
      (await extractClaims("Ambiguous trial", "You get a 14-day trial.")).claims
        .length,
      0,
    );
    assert.equal(
      (
        await extractClaims(
          "Negative trial",
          "New customers do not receive a 14-day trial.",
        )
      ).claims.length,
      0,
    );
    assert.equal(
      (
        await extractClaims(
          "Enterprise trial",
          "Enterprise customers receive a 14-day trial.",
        )
      ).claims[0].scope,
      "enterprise",
    );
  } finally {
    if (oldProvider === undefined) delete process.env.AI_PROVIDER;
    else process.env.AI_PROVIDER = oldProvider;
    if (oldKey) process.env.OPENAI_API_KEY = oldKey;
  }
});
