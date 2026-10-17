import { test } from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { handleDatabaseErrors } from "../server/database-lifecycle.js";
import { api } from "../src/api.js";

test("unexpected database socket errors do not crash the process or expose raw details", () => {
  const client = new EventEmitter();
  const messages: string[] = [];
  const recovered = handleDatabaseErrors(client, (message) =>
    messages.push(message),
  );
  assert.doesNotThrow(() =>
    client.emit("error", new Error("private connection metadata")),
  );
  client.emit("error", new Error("private connection metadata"));
  assert.equal(messages.length, 1);
  assert.ok(!messages[0].includes("private"));
  recovered();
  client.emit("error", new Error("another socket closure"));
  assert.equal(messages.length, 2);
});

test("a hung workspace request becomes a retryable error instead of an infinite spinner", async () => {
  const previous = globalThis.fetch;
  globalThis.fetch = async (_url, options) =>
    new Promise((_resolve, reject) => {
      options!.signal!.addEventListener(
        "abort",
        () => reject(new DOMException("Aborted", "AbortError")),
        { once: true },
      );
    });
  try {
    await assert.rejects(
      api("/workspace", undefined, { timeoutMs: 15 }),
      /workspace connection timed out/,
    );
  } finally {
    globalThis.fetch = previous;
  }
});

test("timed-out writes are not retried and ask users to check saved state", async () => {
  const previous = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async (_url, options) =>
    new Promise((_resolve, reject) => {
      calls++;
      options!.signal!.addEventListener(
        "abort",
        () => reject(new DOMException("Aborted", "AbortError")),
        { once: true },
      );
    });
  try {
    await assert.rejects(
      api("/decisions", { title: "test" }, { timeoutMs: 15 }),
      /check whether the change completed/,
    );
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = previous;
  }
});
