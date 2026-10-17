import { test } from "node:test";
import assert from "node:assert/strict";
import {
  getModelConfig,
  withModelErrors,
  ModelError,
} from "../server/model-config.js";

test("provider selection prefers Gemini when both keys exist and respects explicit choices", () => {
  const keys = { GEMINI_API_KEY: "test-gemini", OPENAI_API_KEY: "test-openai" };
  assert.equal(getModelConfig(keys).provider, "gemini");
  assert.equal(
    getModelConfig({ ...keys, AI_PROVIDER: "openai" }).provider,
    "openai",
  );
  assert.equal(getModelConfig({ ...keys, AI_PROVIDER: "offline" }).model, null);
  assert.equal(getModelConfig({}).provider, "offline");
  assert.equal(getModelConfig({ GEMINI_API_KEY: "   " }).provider, "offline");
  assert.equal(getModelConfig({ AI_PROVIDER: "gemini" }).configured, false);
  assert.throws(
    () => getModelConfig({ AI_PROVIDER: "unknown" }),
    /AI_PROVIDER/,
  );
});

test("quota errors are sanitized and never cause fallback to a different provider", async () => {
  const previous = {
    provider: process.env.AI_PROVIDER,
    key: process.env.GEMINI_API_KEY,
  };
  process.env.AI_PROVIDER = "gemini";
  process.env.GEMINI_API_KEY = "test-only-key";
  let calls = 0;
  try {
    await assert.rejects(
      withModelErrors(async () => {
        calls++;
        throw Object.assign(new Error("sensitive provider metadata"), {
          status: 429,
        });
      }),
      (error) =>
        error instanceof ModelError &&
        error.status === 429 &&
        !error.message.includes("sensitive"),
    );
    assert.equal(calls, 1);
  } finally {
    if (previous.provider === undefined) delete process.env.AI_PROVIDER;
    else process.env.AI_PROVIDER = previous.provider;
    if (previous.key === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = previous.key;
  }
});
