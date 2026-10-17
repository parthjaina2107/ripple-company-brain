import "dotenv/config";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { FalkorDB } from "falkordb";
import { FalkorRepository, type Repository } from "../server/repository.js";
import { createSeed } from "../server/seed.js";
import { RippleService } from "../server/service.js";
import { requestContext } from "../server/request-context.js";
process.env.AI_PROVIDER = "offline";
const name = `audit_race_${randomBytes(12).toString("hex")}`;
const a = await FalkorRepository.connect(process.env.FALKORDB_URL!, name);
const b = await FalkorRepository.connect(process.env.FALKORDB_URL!, name);
try {
  await a.save(createSeed());
  const initial = new RippleService(a);
  const decision = await initial.decide({ topic: "refund_window", title: "Set refund window to 14 days", value: 14, scope: "new", status: "approved", effectiveFrom: "2026-10-17", asOf: "2026-10-17" });
  const impact = decision.impacts.find((item) => item.classification === "conflict")!;
  assert.ok(impact.reviewId);
  let reads = 0; let releaseReads!: () => void; let releaseA!: () => void;
  const bothRead = new Promise<void>((resolve) => { releaseReads = resolve; });
  const wroteA = new Promise<void>((resolve) => { releaseA = resolve; });
  const wrap = (repo: FalkorRepository, second: boolean): Repository => ({
    mode: "falkordb", graphName: name,
    read: async () => { const snapshot = await repo.read(); if (++reads === 2) releaseReads(); await bothRead; return snapshot; },
    paths: (target) => repo.paths(target),
    save: async (snapshot) => { if (second) await wroteA; await repo.save(snapshot); if (!second) releaseA(); },
  });
  const first = new RippleService(wrap(a, false));
  const second = new RippleService(wrap(b, true));
  const results = await Promise.allSettled([
    first.apply(impact.reviewId, "2026-10-17"),
    second.decide({ topic: "trial_duration", title: "Set trial duration to 9 days", value: 9, scope: "new", status: "approved", effectiveFrom: "2026-10-17", asOf: "2026-10-17" }),
  ]);
  assert.equal(results[0].status, "fulfilled");
  assert.equal(results[1].status, "rejected");
  if (results[1].status === "rejected") assert.equal(results[1].reason.status, 409);
  const final = await a.read();
  const artifact = final.nodes.find((n) => n.id === impact.artifact.id)!;
  assert.ok(artifact.content?.includes("14-day"));
  assert.equal(final.nodes.find((n) => n.id === impact.reviewId)?.status, "applied");
  assert.equal(final.nodes.filter((n) => n.kind === "decision" && n.value === 9).length, 0);
  await requestContext.run({ actor: "verification", command: "verification-command" }, async () => {
    await a.save(await a.read());
    await assert.rejects(a.save(await a.read()), /already saved/);
  });
  const oversized = await a.read();
  oversized.nodes.push({ id: "too-large", kind: "document", title: "Size limit test", content: "x".repeat(1500000) });
  await assert.rejects(a.save(oversized), /capacity/);
  assert.ok(!(await a.read()).nodes.some((node) => node.id === "too-large"));
  // A backup restore uses a clean graph revision and preserves all evidence.
  const restoredName = `${name}_restore`;
  const restored = await FalkorRepository.connect(process.env.FALKORDB_URL!, restoredName);
  try {
    const copy = structuredClone(final); copy.revision = 0;
    await restored.save(copy);
    const readback = await restored.read();
    assert.deepEqual(readback.nodes.sort((a, b) => a.id.localeCompare(b.id)), [...final.nodes].sort((a, b) => a.id.localeCompare(b.id)));
    assert.equal(readback.edges.length, final.edges.length);
  } finally {
    await restored.close();
    const db = await FalkorDB.connect({ url: process.env.FALKORDB_URL! });
    (await db.connection).on("error", () => {});
    await db.selectGraph(restoredName).delete(); await db.close();
  }
  console.log(JSON.stringify({ scenario: "two server instances read before either writes; stale decision save follows correction save", originalRevision: impact.artifact.revision, finalRevision: artifact.revision, correctedTextSurvived: artifact.content?.includes("14-day"), oldTextRestored: artifact.content?.includes("30-day"), correctionRecordStillExists: final.nodes.some((n) => n.kind === "correction"), reviewStatus: final.nodes.find((n) => n.id === impact.reviewId)?.status }));
} finally {
  await Promise.all([a.close(), b.close()]);
  const db = await FalkorDB.connect({ url: process.env.FALKORDB_URL!, socket: { connectTimeout: 8000 } });
  (await db.connection).on("error", () => {});
  await db.selectGraph(name).delete();
  await db.close();
  console.log(JSON.stringify({ isolatedAuditGraphRemoved: true }));
}
