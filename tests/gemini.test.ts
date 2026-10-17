import { test } from "node:test";
import assert from "node:assert/strict";
import { answerQuestion, extractClaims } from "../server/ai.js";
import { createSeed } from "../server/seed.js";

test("Gemini transport uses structured extraction and a restricted read-only function declaration", async () => {
  const previous = {
    fetch: globalThis.fetch,
    provider: process.env.AI_PROVIDER,
    key: process.env.GEMINI_API_KEY,
    model: process.env.GEMINI_MODEL,
  };
  process.env.AI_PROVIDER = "gemini";
  process.env.GEMINI_API_KEY = "test-only-gemini-key";
  process.env.GEMINI_MODEL = "gemini-3.5-flash";
  const bodies: Record<string, any>[] = [];
  const quote = "New self-serve customers receive a 14-day trial.";
  globalThis.fetch = async (_input, options) => {
    const body = JSON.parse(String(options?.body));
    bodies.push(body);
    const part = body.tools
      ? {
          functionCall: {
            name: "get_policy_context",
            args: { topic: "trial_duration" },
          },
        }
      : {
          text: JSON.stringify({
            claims: [{ value: 14, scope: "new", quote }],
          }),
        };
    return new Response(
      JSON.stringify({
        candidates: [
          { content: { role: "model", parts: [part] }, finishReason: "STOP" },
        ],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };
  try {
    const extraction = await extractClaims("Transport test", quote);
    assert.equal(extraction.claims[0].value, 14);
    assert.match(extraction.method, /Gemini/);
    assert.equal(
      bodies[0].generationConfig.responseMimeType,
      "application/json",
    );
    const answer = await answerQuestion(
      createSeed(),
      "How long is the trial?",
      "new",
      "2026-10-16",
    );
    assert.equal(answer.mode, "model");
    assert.equal(answer.sources[0].value, 14);
    assert.equal(
      bodies[1].tools[0].functionDeclarations[0].name,
      "get_policy_context",
    );
    assert.deepEqual(
      bodies[1].toolConfig.functionCallingConfig.allowedFunctionNames,
      ["get_policy_context"],
    );
    assert.deepEqual(bodies[0].generationConfig.responseJsonSchema.properties.claims.items.properties.topic.enum,
      ["trial_duration", "refund_window", "cancellation_notice", "support_response"]);
    assert.deepEqual(bodies[1].tools[0].functionDeclarations[0].parametersJsonSchema.properties.topic.enum,
      ["trial_duration", "refund_window", "cancellation_notice", "support_response", "unsupported"]);
  } finally {
    globalThis.fetch = previous.fetch;
    for (const [name, value] of Object.entries({
      AI_PROVIDER: previous.provider,
      GEMINI_API_KEY: previous.key,
      GEMINI_MODEL: previous.model,
    })) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
});
