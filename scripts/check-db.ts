import "dotenv/config";
import { FalkorRepository } from "../server/repository.js";
import { policies, policyTopics } from "../shared/policies.js";

function fail(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  const code = (error as { code?: string })?.code;
  const reason = /WRONGPASS|AUTH|password/i.test(message)
    ? "Database authentication was rejected."
    : /TLS|SSL|certificate/i.test(message)
      ? "Check the database TLS settings."
      : code || "Connection or graph query failed.";
  // Do not print raw SDK errors: they can contain connection details.
  console.error(JSON.stringify({ connected: false, reason }));
  process.exit(1);
}
process.on("uncaughtException", fail);
setTimeout(() => fail(new Error("Connection timeout")), 20000).unref();

async function main() {
  if (!process.env.FALKORDB_URL) {
    console.error("Set FALKORDB_URL in .env first.");
    process.exit(1);
  }
  const repo = await FalkorRepository.connect(
    process.env.FALKORDB_URL,
    process.env.FALKORDB_GRAPH || "ripple_hackathon",
  );
  const state = await repo.read();
  const paths = await repo.paths("topic-trial");
  const neighborhoods = await Promise.all(policyTopics.map(async (topic) => ({ topic, dependencyPaths: (await repo.paths(policies[topic].root)).length })));
  console.log(JSON.stringify({ connected: true, nodes: state.nodes.length,
    edges: state.edges.length, dependencyPaths: paths.length, neighborhoods }, null, 2));
  process.exit(0);
}
main().catch(fail);
