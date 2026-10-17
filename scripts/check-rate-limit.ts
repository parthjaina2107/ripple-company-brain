import "dotenv/config";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { FalkorDB } from "falkordb";
import { CloudRateStore } from "../server/rate-limit.js";

const name = `security_verify_${randomBytes(12).toString("hex")}`;
const stores = [new CloudRateStore(name), new CloudRateStore(name)];
const now = Date.now();
let db: FalkorDB | undefined;
try {
  const results = await Promise.all(Array.from({ length: 8 }, (_, index) => stores[index % 2].consume("same-visitor:ask", 60000, now)));
  assert.deepEqual(results.map((row) => row.count).sort((a, b) => a - b), [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.ok(results.every((row) => row.resetAt === now + 60000));
  assert.equal((await stores[1].consume("other-visitor:ask", 60000, now)).count, 1);
  assert.equal((await stores[0].consume("same-visitor:ask", 60000, now + 60000)).count, 1);
  console.log(JSON.stringify({ sharedCloudRateCounters: "passed", concurrentConnections: "passed", identityIsolation: "passed", windowReset: "passed" }));
} catch {
  console.error("Shared rate limit verification failed. No credentials logged.");
  process.exitCode = 1;
} finally {
  await Promise.all(stores.map((store) => store.close()));
  db = await FalkorDB.connect({ url: process.env.FALKORDB_URL, socket: { connectTimeout: 8000 } });
  (await db.connection).on("error", () => {});
  if ((await db.list()).includes(name)) await db.selectGraph(name).delete();
  await db.close();
  console.log(JSON.stringify({ temporaryRateGraphRemoved: true }));
}
