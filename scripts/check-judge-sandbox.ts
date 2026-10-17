import "dotenv/config";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { createServer } from "node:http";
import { FalkorDB } from "falkordb";
import { graphFromCookie } from "../server/judge-sandbox.js";

// Exercise the exact Vercel handler over HTTP with two separate cookie jars.
// Only graphs created by this test are eligible for cleanup.
process.env.RIPPLE_SHARE_DEMO = "true";
process.env.RIPPLE_MODE = "falkordb";
process.env.AI_PROVIDER = "offline";
process.env.RIPPLE_SANDBOX_SECRET = randomBytes(32).toString("hex");
const { default: handler } = await import("../api/judge.js");
const server = createServer(handler);
await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
const address = server.address();
assert.ok(address && typeof address !== "string");
const base = `http://127.0.0.1:${address.port}/api/judge`;
const created = new Set<string>();
async function request(path: string, cookie = "", body?: unknown, origin = "https://ripple-company-brain.vercel.app") {
  const response = await fetch(`${base}?path=${encodeURIComponent(path)}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { Origin: origin, ...(cookie ? { Cookie: cookie } : {}), ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(45000),
  });
  return { response, data: await response.json() };
}
let db: FalkorDB | undefined;
try {
  const a = await request("/session", "", {});
  assert.equal(a.response.status, 200);
  const cookieA = a.response.headers.get("set-cookie")!.split(";")[0];
  created.add(graphFromCookie(cookieA));
  const b = await request("/session", "", {});
  assert.equal(b.response.status, 200);
  const cookieB = b.response.headers.get("set-cookie")!.split(";")[0];
  created.add(graphFromCookie(cookieB));
  assert.equal(created.size, 2);
  assert.equal((await request("/workspace")).response.status, 401);
  assert.equal((await request("/workspace", cookieA + "invalid")).response.status, 401);
  assert.equal((await request("/ask", cookieA, { question: "What is our refund window?", scope: "new", asOf: "2026-10-17" }, "https://untrusted.example")).response.status, 403);
  const ask = (cookie: string) => request("/ask", cookie, { question: "What is our refund window?", scope: "new", asOf: "2026-10-17" });
  assert.equal((await ask(cookieA)).data.sources[0].value, 30);
  const changed = await request("/decisions", cookieA, { topic: "refund_window", title: "Set refund window to 14 days", value: 14, scope: "new", effectiveFrom: "2026-10-17", asOf: "2026-10-17", status: "approved" });
  assert.equal(changed.response.status, 201);
  const conflict = changed.data.impacts.find((impact: { classification: string }) => impact.classification === "conflict");
  assert.ok(conflict?.reviewId);
  assert.equal((await request(`/reviews/${conflict.reviewId}/apply`, cookieA, { asOf: "2026-10-17" })).response.status, 200);
  assert.equal((await request(`/reviews/${conflict.reviewId}/apply`, cookieA, { asOf: "2026-10-17" })).response.status, 200);
  const exported = await request(`/reviews/${conflict.reviewId}/export`, cookieA);
  assert.equal(exported.response.status, 200);
  assert.match(exported.data.packet.corrected, /14-day/);
  assert.equal((await ask(cookieA)).data.sources[0].value, 14);
  assert.equal((await ask(cookieB)).data.sources[0].value, 30);
  const resumed = await request("/session", cookieA, {});
  assert.equal(graphFromCookie(resumed.response.headers.get("set-cookie")!.split(";")[0]), graphFromCookie(cookieA));
  const workspace = await request("/workspace", cookieA);
  assert.equal(workspace.data.health.storage, "falkordb");
  assert.equal(workspace.data.graph.nodes.filter((node: { kind: string }) => node.kind === "correction").length, 1);
  console.log(JSON.stringify({ judgeHTTPWorkflow: "passed", cloudStorage: "falkordb", separateVisitors: "passed", signedSessionValidation: "passed", originValidation: "passed", refundBefore: 30, refundAfter: 14, secondVisitorRefund: 30, repeatApply: "idempotent", correctionExport: "passed", sessionResume: "passed" }));
} catch (error) {
  console.error("Judge sandbox verification failed:", error instanceof Error ? error.message : "unknown error");
  process.exitCode = 1;
} finally {
  server.close();
  const connectionOptions = { url: process.env.FALKORDB_URL!, socket: { connectTimeout: 8000 }, disableOfflineQueue: true };
  db = await FalkorDB.connect(connectionOptions);
  (await db.connection).on("error", () => {});
  for (const graph of created) await db.selectGraph(graph).delete();
  await db.close();
  console.log(JSON.stringify({ temporaryJudgeGraphsRemoved: created.size }));
}
// This isolated verification process also imported the shared app's Cloud client.
process.exit(process.exitCode || 0);
