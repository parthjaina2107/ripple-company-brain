import { test } from "node:test";
import assert from "node:assert/strict";
import { answerQuestion } from "../server/ai.js";
import { createSeed } from "../server/seed.js";

test("greetings offer guidance without invented sources; mixed policy questions still use factual lookup", async () => {
  const previous = process.env.AI_PROVIDER;
  process.env.AI_PROVIDER = "offline";
  try {
    const greeting = await answerQuestion(createSeed(), "hello", "new", "2026-10-16");
    assert.equal(greeting.mode, "guidance");
    assert.equal(greeting.sources.length, 0);
    assert.match(greeting.text, /Hi!.*Ripple/);
    const question = await answerQuestion(createSeed(), "Hello, how long is the trial?", "new", "2026-10-16");
    assert.equal(question.mode, "structured");
    assert.equal(question.sources[0].value, 14);
    const unsupported = await answerQuestion(createSeed(), "What is our pricing policy?", "new", "2026-10-16");
    assert.equal(unsupported.sources.length, 0);
    assert.notEqual(unsupported.mode, "guidance");
  } finally {
    if (previous === undefined) delete process.env.AI_PROVIDER; else process.env.AI_PROVIDER = previous;
  }
});
