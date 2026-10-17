import assert from "node:assert/strict";
const base = process.argv[2];
if (!base || !/^https:\/\/[a-zA-Z0-9.-]+\.vercel\.app$/.test(base)) throw new Error("Supply the verified Vercel deployment origin.");
let cookie = "";
async function call(path: string, body?: unknown) {
  const response = await fetch(`${base}/api/judge?path=${encodeURIComponent(path)}`, { method: body === undefined ? "GET" : "POST", headers: { Origin: "https://ripple-company-brain.vercel.app", ...(cookie ? { Cookie: cookie } : {}), ...(body === undefined ? {} : { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() }) }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(90000) });
  assert.match(response.headers.get("content-type") || "", /application\/json/, "Deployment returned HTML instead of the API. Use the public alias or authenticated Vercel access.");
  const data = await response.json();
  assert.ok(response.ok, `${path}: HTTP ${response.status} ${data.error || ""}`);
  const next = response.headers.get("set-cookie"); if (next) cookie = next.split(";")[0];
  return data;
}
try {
  const health = await fetch(`${base}/api/health`); assert.equal(health.status, 200);
  assert.match(health.headers.get("content-type") || "", /application\/json/, "Use the public alias or authenticated Vercel access.");
  assert.equal((await health.json()).storage, "falkordb");
  await call("/session", {});
  const ask = (question: string, scope = "new", asOf = "2026-10-17") => call("/ask", { question, scope, asOf });
  const before = await ask("What is our refund window?"); assert.equal(before.sources[0].value, 30); assert.equal(before.mode, "model");
  const research = await call("/research", { website: `${base}/acme-policies.html` });
  assert.ok(research.findings.length >= 4);
  const refund = research.findings.find((f: { topic: string }) => f.topic === "refund_window");
  await call(`/research/${research.id}/approve`, { effectiveFrom: "2026-10-17", selections: [{ findingId: refund.id, scope: "new" }] });
  const report = await call("/decisions", { topic: "refund_window", title: "Set refund window to 14 days", value: 14, scope: "new", status: "approved", effectiveFrom: "2026-10-17", asOf: "2026-10-17" });
  const conflict = report.impacts.find((i: { classification: string }) => i.classification === "conflict"); assert.ok(conflict?.reviewId);
  await call(`/reviews/${conflict.reviewId}/apply`, { asOf: "2026-10-17" });
  const packet = await call(`/reviews/${conflict.reviewId}/export`); assert.match(packet.packet.corrected, /14-day/); assert.match(packet.packet.actor, /^judge:/);
  const receipt = await call(`/reviews/${conflict.reviewId}/publish`, {}); assert.match(receipt.content, /14-day/);
  assert.equal((await ask("What is our refund window?")).sources[0].value, 14);
  assert.equal((await ask("What is our refund window?", "enterprise")).sources[0].value, 60);
  assert.equal((await ask("What is our refund window?", "new", "2026-10-01")).sources[0].value, 30);
  for (const question of ["Can trial users export data?", "Can support reset my password?", "How long does a refund take to process?"]) assert.equal((await ask(question)).sources.length, 0);
  assert.ok((await call("/workspace")).graph.nodes.some((n: { id: string }) => n.id === receipt.id));
  console.log(JSON.stringify({ deployment: base, cloud: "passed", liveGemini: "passed", publicResearchAndApproval: "passed", changeCorrectionExportPublish: "passed", historicalAndEnterprise: "passed", unsupportedIntent: "passed" }));
} finally {
  if (cookie) { try { await call("/release", {}); console.log("Disposable verification sandbox released."); } catch { console.error("Verification sandbox release failed; expiry cleanup remains scheduled."); } }
}
