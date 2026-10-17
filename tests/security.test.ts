import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import express from "express";
import { productionOrigin, requestSecurity, securityHeaders } from "../server/security.js";
import { apiRateLimit, operationBudget, rateIdentity, type RateStore } from "../server/rate-limit.js";

test("static CDN and Express use the same restrictive security headers", async () => {
  const config = JSON.parse(await readFile(new URL("../vercel.json", import.meta.url), "utf8"));
  const headers = Object.fromEntries(config.headers[0].headers.map((h: {key: string; value: string}) => [h.key, h.value]));
  for (const [key, value] of Object.entries(securityHeaders)) assert.equal(headers[key], value);
  assert.equal(headers["Access-Control-Allow-Origin"], productionOrigin);
  assert.match(headers["Content-Security-Policy"], /frame-ancestors 'none'/);
  assert.match(headers["Content-Security-Policy"], /connect-src 'self'/);
  assert.match(headers["Content-Security-Policy"], /script-src 'self';/);
});

test("rate identities ignore untrusted forwarding headers locally and budgets cannot be bypassed by route aliases", () => {
  const previous = process.env.VERCEL;
  delete process.env.VERCEL;
  try {
    const socket = { remoteAddress: "127.0.0.1" } as express.Request["socket"];
    assert.equal(rateIdentity({ socket, headers: { "x-real-ip": "one", "x-forwarded-for": "one" } }), rateIdentity({ socket, headers: { "x-real-ip": "two" } }));
    assert.deepEqual(operationBudget("/api/demo/ask"), operationBudget("/api/judge/ask"));
    assert.equal(operationBudget("/api/judge/research").max, 3);
  } finally { if (previous === undefined) delete process.env.VERCEL; else process.env.VERCEL = previous; }
});

test("HTTP boundary blocks other origins, returns retryable 429s and fails closed when the limiter is unavailable", async () => {
  let count = 0; let fail = false;
  const store: RateStore = { consume: async (_key, windowMs, now) => {
    if (fail) throw new Error("internal store details must stay private");
    return { count: ++count, resetAt: now + windowMs };
  } };
  const app = express();
  app.use(requestSecurity, apiRateLimit(store));
  app.post("/api/demo/ask", (_req, res) => res.json({ answer: "ok" }));
  app.use((error: { status: number; message: string }, _req: express.Request, res: express.Response, _next: express.NextFunction) => res.status(error.status || 500).json({ error: error.message }));
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address(); assert.ok(address && typeof address !== "string");
  const url = `http://127.0.0.1:${address.port}/api/demo/ask`;
  const post = (origin: string) => fetch(url, { method: "POST", headers: { Origin: origin } });
  try {
    const denied = await post("https://untrusted.example");
    assert.equal(denied.status, 403);
    assert.notEqual(denied.headers.get("access-control-allow-origin"), "*");
    assert.equal(count, 0);
    const allowed = await post(productionOrigin);
    assert.equal(allowed.status, 200);
    assert.equal(allowed.headers.get("cache-control"), "no-store");
    assert.equal(allowed.headers.get("x-frame-options"), "DENY");
    count = 30;
    const limited = await post(productionOrigin);
    assert.equal(limited.status, 429);
    assert.ok(Number(limited.headers.get("retry-after")) > 0);
    assert.equal(limited.headers.get("ratelimit-remaining"), "0");
    fail = true;
    const unavailable = await post(productionOrigin);
    assert.equal(unavailable.status, 503);
    assert.doesNotMatch(await unavailable.text(), /internal store/);
  } finally { server.closeAllConnections(); await new Promise<void>((resolve) => server.close(() => resolve())); }
});
