import "dotenv/config";
import assert from "node:assert/strict";
import { extractClaims, answerQuestion } from "../server/ai.js";
import { getModelConfig, ModelError } from "../server/model-config.js";
import { createSeed } from "../server/seed.js";
import { policies, policyTopics, topicOf } from "../shared/policies.js";

async function main() {
  const config = getModelConfig();
  if (!config.configured)
    throw new ModelError(
      "Configure an API key for the selected provider first.",
    );
  const content =
    "New self-serve customers receive a 14-day free trial. Enterprise customers receive a 21-day trial. New self-serve customers have a 30-day refund window after purchase. New self-serve customers must give 30 days of cancellation notice before renewal. New self-serve customers receive an initial support response within 24 hours. If approved, some customers might get a 30-day trial.";
  const extraction = await extractClaims(
    "Synthetic model verification",
    content,
  );
  assert.equal(extraction.claims.length, 5);
  assert.ok(extraction.claims.some((c) => c.value === 14 && c.scope === "new"));
  assert.ok(
    extraction.claims.some((c) => c.value === 21 && c.scope === "enterprise"),
  );
  assert.ok(extraction.claims.every((c) => content.includes(c.quote)));
  assert.deepEqual(new Set(extraction.claims.map(topicOf)), new Set(policyTopics));
  console.log(
    JSON.stringify({
      extraction: "passed",
      method: extraction.method,
      reviewedClaimCount: extraction.claims.length,
    }),
  );
  const supported = await answerQuestion(
    createSeed(),
    "How long is the free trial?",
    "new",
    "2026-10-16",
  );
  assert.equal(supported.mode, "model");
  assert.equal(supported.sources[0]?.value, 14);
  console.log(
    JSON.stringify({ supportedToolCall: "passed", mode: supported.mode }),
  );
  for (const topic of policyTopics.filter((key) => key !== "trial_duration")) {
    const answer = await answerQuestion(createSeed(), policies[topic].question, "new", "2026-10-16");
    assert.equal(answer.mode, "model");
    assert.equal(topicOf(answer.sources[0]), topic);
    assert.equal(answer.sources[0].value, policies[topic].initial);
    console.log(JSON.stringify({ topic, toolCall: "passed", value: answer.sources[0].value }));
  }
  const unknown = await answerQuestion(
    createSeed(),
    "What is our pricing policy?",
    "new",
    "2026-10-16",
  );
  assert.equal(unknown.mode, "structured", "Unsupported intent is rejected before spending a model call");
  assert.equal(unknown.sources.length, 0);
  console.log(
    JSON.stringify({
      unsupportedTopic: "passed",
      provider: config.provider,
      model: config.model,
    }),
  );
}
main().catch((error) => {
  console.error(
    JSON.stringify({
      ok: false,
      reason:
        error instanceof ModelError
          ? error.message
          : error instanceof assert.AssertionError
            ? "Model output did not satisfy the behavior checks."
            : "Model verification failed. No credentials were logged.",
    }),
  );
  process.exitCode = 1;
});
