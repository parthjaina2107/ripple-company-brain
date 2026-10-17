import "dotenv/config";
import assert from "node:assert/strict";
import { researchPages } from "../server/public-web.js";
import { discoverPublicFindings } from "../server/ai.js";
import { ModelError } from "../server/model-config.js";

try {
  // Public test domain verifies network access without claiming these are company policies.
  const publicResult = await researchPages("https://example.com");
  assert.ok(publicResult.pages.length >= 1);
  assert.ok(publicResult.pages.every((page) => page.url.startsWith("https://example.com/")));
  console.log(JSON.stringify({ publicPageFetch: "passed", pages: publicResult.pages.length }));
  const findings = await discoverPublicFindings([{ url: "https://example.com/synthetic-policy-fixture", title: "Synthetic test fixture — not website facts", text: "We offer a 14-day trial. All customers have a 30-day refund window after purchase.", retrievedAt: new Date().toISOString() }]);
  assert.equal(findings.length, 2);
  assert.equal(findings.find((finding) => finding.topic === "trial_duration")?.scope, undefined);
  assert.equal(findings.find((finding) => finding.topic === "refund_window")?.scope, "all");
  console.log(JSON.stringify({ structuredPublicFindings: "passed", findings: findings.length, savedToWorkspace: false }));
} catch (error) {
  console.error(JSON.stringify({ ok: false, reason: error instanceof ModelError ? error.message : "Public research verification failed. No credentials were logged." }));
  process.exitCode = 1;
}
