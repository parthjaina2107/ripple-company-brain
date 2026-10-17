import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { FalkorDB } from "falkordb";
import { CompanyWorkspaces, companyGraphName } from "../server/company-workspaces.js";
import { FalkorRepository } from "../server/repository.js";
import type { ResearchResult } from "../shared/types.js";
import { RippleService } from "../server/service.js";
import { discoverPublicFindings } from "../server/ai.js";
import { getModelConfig } from "../server/model-config.js";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

// Only nonce-named graphs created by this run may be removed during cleanup.
const companies = ["A", "B"].map((name) => ({ id: `verification-${randomUUID()}`, name: `Synthetic verification ${name}`, website: "https://example.com" }));
const names = companies.map((company) => companyGraphName(company.id));
const created = new Set<string>();
const repos: FalkorRepository[] = [];
let db: FalkorDB | undefined;
const liveModel = process.argv.includes("--model");
try {
  if (!process.env.FALKORDB_URL) throw new Error("Missing database configuration");
  process.env.RIPPLE_MODE = "falkordb";
  if (!liveModel) process.env.AI_PROVIDER = "offline";
  if (liveModel) assert.ok(getModelConfig().configured, "A live model must be configured");
  const connectionOptions = { url: process.env.FALKORDB_URL, socket: { connectTimeout: 8000 }, disableOfflineQueue: true };
  db = await FalkorDB.connect(connectionOptions);
  (await db.connection).on("error", () => {});
  const existing = await db.list();
  assert.ok(names.every((name) => !existing.includes(name)));
  const manager = new CompanyWorkspaces();
  for (const name of names) created.add(name);
  const a = await manager.get(companies[0]); repos.push(a.repo as FalkorRepository);
  const b = await manager.get(companies[1]); repos.push(b.repo as FalkorRepository);
  assert.equal((await a.workspace()).graph.nodes.length, 5);
  assert.equal((await b.workspace()).graph.nodes.length, 5);
  const research: ResearchResult = { id: "synthetic-research", website: companies[0].website, pages: [{ title: "Synthetic policy fixture, not website facts", url: "https://example.com/synthetic-policy", text: "New customers have a 30-day refund window after purchase.", retrievedAt: new Date().toISOString() }], findings: [{ id: "synthetic-finding", topic: "refund_window", value: 30, quote: "New customers have a 30-day refund window after purchase.", sourceUrl: "https://example.com/synthetic-policy", scope: "new" }], warnings: [], createdAt: new Date().toISOString() };
  if (liveModel) {
    research.findings = await discoverPublicFindings(research.pages);
    assert.equal(research.findings.length, 1);
    assert.equal(research.findings[0].value, 30);
    assert.equal(research.findings[0].topic, "refund_window");
  }
  const selected = [{ findingId: research.findings[0].id, scope: "new" as const }];
  const state = await a.repo.read();
  state.nodes.push({ id: research.id, kind: "research", title: "Synthetic verification", content: JSON.stringify(research), status: "pending" });
  await a.repo.save(state);
  await assert.rejects(b.approveResearch(research.id, selected, "2026-10-17"));
  await a.approveResearch(research.id, selected, "2026-10-17");
  const before = await a.ask("What is our refund window?", "new", "2026-10-17");
  assert.equal(before.sources[0].value, 30);
  if (liveModel) assert.equal(before.mode, "model");
  const change = await a.decide({ topic: "refund_window", title: "Set refund window to 14 days", value: 14, status: "approved", scope: "new", effectiveFrom: "2026-10-17", asOf: "2026-10-17" });
  const conflict = change.impacts.find((impact) => impact.classification === "conflict");
  assert.ok(conflict?.reviewId);
  await a.apply(conflict.reviewId, "2026-10-17");
  await a.apply(conflict.reviewId, "2026-10-17"); // Retry must not produce a second correction.
  const after = await a.ask("What is our refund window?", "new", "2026-10-17");
  assert.equal(after.sources[0].value, 14);
  const exported = await a.exportCorrection(conflict.reviewId, companies[0]);
  assert.match(exported.packet.original, /30-day/);
  assert.match(exported.packet.corrected, /14-day/);
  assert.equal((await a.workspace()).graph.nodes.filter((node) => node.kind === "correction").length, 1);
  const reopenedRepo = await FalkorRepository.connect(process.env.FALKORDB_URL, names[0]); repos.push(reopenedRepo);
  const recalled = await new RippleService(reopenedRepo).ask("What is our refund window?", "new", "2026-10-17");
  assert.equal(recalled.sources[0].value, 14);
  assert.equal((await b.workspace()).graph.nodes.length, 5);
  assert.ok((await a.repo.paths("topic-refund")).length > 0);
  const report = { checkedAt: new Date().toISOString(), cloudCompanyIsolation: "passed", approvedResearchChangeCorrectionAndRecall: "passed", nativeGraphPaths: "passed", model: liveModel ? getModelConfig().model : "offline (storage-only check)", beforeValue: before.sources[0].value, afterDecisionAndCorrectionValue: after.sources[0].value, freshConnectionRecallValue: recalled.sources[0].value, repeatedApplyCorrectionCount: 1, correctionExport: "passed", fixture: "synthetic public-format policy, not actual website facts" };
  if (liveModel) {
    await mkdir(resolve("artifacts"), { recursive: true });
    await writeFile(resolve("artifacts/live-verification.json"), JSON.stringify(report, null, 2));
    await writeFile(resolve("artifacts/approved-correction.md"), exported.markdown);
  }
  console.log(JSON.stringify(report));
} catch {
  console.error("Company isolation verification failed. No credentials were logged.");
  process.exitCode = 1;
} finally {
  for (const repo of repos) await repo.close();
  if (db) {
    for (const name of created) {
      if ((await db.list()).includes(name)) await db.selectGraph(name).delete();
    }
    await db.close();
    console.log(JSON.stringify({ temporaryVerificationGraphsRemoved: created.size }));
  }
}
