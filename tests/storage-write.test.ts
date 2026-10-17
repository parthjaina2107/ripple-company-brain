import { test } from "node:test";
import assert from "node:assert/strict";
import { buildGraphWrite } from "../server/repository.js";
import { createSeed } from "../server/seed.js";

test("graph writes retain one compact parameterized query shape as the workspace grows", () => {
  const small = buildGraphWrite({ nodes: [{ id: "one", kind: "document", title: "Secret-like user text must stay in parameters" }], edges: [] });
  const large = buildGraphWrite(createSeed());
  assert.equal(small.query, large.query);
  assert.ok(large.query.length < 3000);
  assert.ok(!small.query.includes("Secret-like"));
  assert.match(small.params.nodes[0].payload as string, /Secret-like/);
  assert.equal(small.params.edges_REPAIRS.length, 0);
  assert.equal((small.query.match(/WITH count\(\*\)/g) || []).length, 6);
  assert.ok(large.params.edges_ASSERTS.length > 0);
});

test("invalid relationship types and dangling endpoints fail before a graph write", () => {
  const state = createSeed();
  state.edges.push({ id: "bad", source: "missing", target: "topic-trial", type: "DEPENDS_ON", active: true });
  assert.throws(() => buildGraphWrite(state), /Invalid graph edge/);
  state.edges.pop();
  state.nodes.push(state.nodes[0]);
  assert.throws(() => buildGraphWrite(state), /Duplicate graph node/);
});
