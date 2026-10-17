import "dotenv/config";
import assert from "node:assert/strict";
import { createConnection, createServer, type Socket } from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import { FalkorRepository } from "../server/repository.js";

// A temporary loopback proxy drops only this test client's connection. It does
// not stop the Cloud instance, kill another client, or change any domain data.
async function main() {
  const original = new URL(process.env.FALKORDB_URL || "");
  if (!["redis:", "falkor:"].includes(original.protocol))
    throw new Error(
      "This loopback fault check supports non-TLS instances only.",
    );
  let allowConnections = true;
  const sockets = new Set<Socket>();
  const proxy = createServer((downstream) => {
    if (!allowConnections) {
      downstream.destroy();
      return;
    }
    const upstream = createConnection({
      host: original.hostname,
      port: Number(original.port || 6379),
    });
    sockets.add(downstream);
    sockets.add(upstream);
    downstream.on("error", () => upstream.destroy());
    upstream.on("error", () => downstream.destroy());
    downstream.on("close", () => {
      sockets.delete(downstream);
      upstream.destroy();
    });
    upstream.on("close", () => {
      sockets.delete(upstream);
      downstream.destroy();
    });
    downstream.pipe(upstream);
    upstream.pipe(downstream);
  });
  await new Promise<void>((resolve) => proxy.listen(0, "127.0.0.1", resolve));
  const address = proxy.address();
  if (!address || typeof address === "string")
    throw new Error("Proxy did not start.");
  const local = new URL(original);
  local.hostname = "127.0.0.1";
  local.port = String(address.port);
  let repo: FalkorRepository | undefined;
  const waitUntil = async (condition: () => boolean) => {
    const end = Date.now() + 12000;
    while (!condition()) {
      if (Date.now() > end) throw new Error("Reconnect deadline exceeded.");
      await delay(50);
    }
  };
  try {
    repo = await FalkorRepository.connect(
      local.toString(),
      process.env.FALKORDB_GRAPH || "ripple_hackathon",
    );
    const before = await repo.read();
    allowConnections = false;
    for (const socket of [...sockets]) socket.destroy();
    await waitUntil(() => !repo!.isReady());
    await assert.rejects(repo.read());
    allowConnections = true;
    await waitUntil(() => repo!.isReady());
    const after = await repo.read();
    assert.equal(after.nodes.length, before.nodes.length);
    assert.equal(after.edges.length, before.edges.length);
    console.log(
      JSON.stringify({
        recovered: true,
        disconnectedReadsRejected: true,
        domainDataUnchanged: true,
      }),
    );
  } finally {
    if (repo) await repo.close();
    for (const socket of [...sockets]) socket.destroy();
    await new Promise<void>((resolve) => proxy.close(() => resolve()));
  }
}
main().catch(() => {
  console.error("Reconnect check failed; no credentials were logged.");
  process.exitCode = 1;
});
