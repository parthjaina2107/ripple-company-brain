import { test } from "node:test";
import assert from "node:assert/strict";
import { sandboxLifetime, sandboxOperationAllowed, sandboxToken, verifySandboxToken } from "../server/judge-sandbox.js";

test("sandbox capabilities reject forgery, expired graphs and other workspace namespaces", () => {
  const now = Date.now();
  const prefix = "rj_1234abcd_";
  const graph = `${prefix}${now + sandboxLifetime}_0123456789abcdef01234567`;
  const key = "a-test-only-key-long-enough-for-verification";
  const token = sandboxToken(graph, key);
  assert.equal(verifySandboxToken(token, key, prefix, now), graph);
  assert.throws(() => verifySandboxToken(token, "different-key", prefix, now));
  assert.throws(() => verifySandboxToken(token, key, "rj_abcd1234_", now));
  assert.throws(() => verifySandboxToken(token, key, prefix, now + sandboxLifetime));
  assert.throws(() => verifySandboxToken(token + ".extra", key, prefix, now));
  assert.throws(() => verifySandboxToken(sandboxToken("ripple_hackathon", key), key, prefix, now));
});

test("sandbox route allowlist permits the judge workflow but never company or admin APIs", () => {
  for (const [method, path] of [["GET", "/workspace"], ["POST", "/ask"], ["POST", "/decisions"], ["POST", "/reviews/example-id/apply"], ["GET", "/reviews/example-id/export"], ["POST", "/documents"], ["POST", "/research"]])
    assert.equal(sandboxOperationAllowed(method, path), true);
  for (const [method, path] of [["DELETE", "/workspace"], ["GET", "/auth/session"], ["POST", "/auth/sign-up/email"], ["POST", "/../decisions"], ["POST", "/workspace"], ["POST", "/session"], ["GET", "/decisions"]])
    assert.equal(sandboxOperationAllowed(method, path), false);
});
