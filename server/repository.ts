import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { FalkorDB } from "falkordb";
import type { EvidencePath, GraphState, Relation } from "../shared/types.js";
import { createSeed, expandCompanyKnowledge } from "./seed.js";
import { handleDatabaseErrors } from "./database-lifecycle.js";
import { refreshSampleData } from "./sample-data.js";
import { reconcileReviews } from "./domain.js";

async function upgradeWorkspace(state: GraphState): Promise<boolean> {
  const before = JSON.stringify(state, null, 2);
  const expanded = expandCompanyKnowledge(state);
  const refreshed = refreshSampleData(state);
  if (!expanded && !refreshed) return false;
  reconcileReviews(state, "2026-10-17");
  await mkdir(resolve(".data/backups"), { recursive: true });
  await writeFile(resolve(".data/backups", `workspace-before-refresh-${Date.now()}.json`), before, "utf8");
  return true;
}

export interface Repository {
  mode: "preview" | "falkordb";
  isReady?(): boolean;
  read(): Promise<GraphState>;
  save(state: GraphState): Promise<void>;
  paths(target: string, depth?: number): Promise<EvidencePath[]>;
}

export function traverse(
  state: GraphState,
  target: string,
  depth = 6,
): EvidencePath[] {
  const output: EvidencePath[] = [];
  const visit = (ids: string[], relations: string[]) => {
    if (relations.length >= depth) return;
    for (const e of state.edges.filter(
      (e) =>
        e.active &&
        ["DEPENDS_ON", "ASSERTS"].includes(e.type) &&
        e.target === ids[0],
    )) {
      if (ids.includes(e.source)) continue;
      const next = {
        ids: [e.source, ...ids],
        relations: [e.type, ...relations],
      };
      output.push(next);
      visit(next.ids, next.relations);
    }
  };
  visit([target], []);
  return output;
}

export class PreviewRepository implements Repository {
  mode = "preview" as const;
  constructor(private file = resolve(".data/preview.json")) {}
  async read(): Promise<GraphState> {
    try {
      const state: GraphState = JSON.parse(await readFile(this.file, "utf8"));
      if (await upgradeWorkspace(state)) await this.save(state);
      return state;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      const state = createSeed();
      await this.save(state);
      return state;
    }
  }
  async save(state: GraphState) {
    await mkdir(dirname(this.file), { recursive: true });
    const temp = `${this.file}.tmp`;
    await writeFile(temp, JSON.stringify(state, null, 2), "utf8");
    await rename(temp, this.file);
  }
  async paths(target: string, depth = 6) {
    return traverse(await this.read(), target, depth);
  }
}

export const IMPACT_QUERY = `MATCH p=(a:Entity)-[:DEPENDS_ON|ASSERTS*1..6]->(topic:Entity {id: $target})
WHERE all(r IN relationships(p) WHERE r.active = true)
RETURN [n IN nodes(p) | n.id] AS ids, [r IN relationships(p) | type(r)] AS relations`;

const allowedRelations: Relation[] = [
  "DEPENDS_ON",
  "ASSERTS",
  "OWNED_BY",
  "SUPERSEDES",
  "CREATES",
  "REPAIRS",
];

export function buildGraphWrite(state: GraphState) {
  const ids = new Set(state.nodes.map((node) => node.id));
  if (ids.size !== state.nodes.length) throw new Error("Duplicate graph node IDs.");
  const params: Record<string, Array<Record<string, string | boolean>>> = {
    nodes: state.nodes.map((node) => ({ id: node.id, kind: node.kind, payload: JSON.stringify(node) })),
  };
  const clauses = ["UNWIND $nodes AS row", "MERGE (node:Entity {id: row.id}) SET node.payload = row.payload, node.kind = row.kind"];
  for (const e of state.edges) {
    if (!allowedRelations.includes(e.type) || !ids.has(e.source) || !ids.has(e.target)) throw new Error("Invalid graph edge.");
  }
  for (const type of allowedRelations) {
    const parameter = `edges_${type}`;
    params[parameter] = state.edges.filter((e) => e.type === type).map((e) => ({ id: e.id, source: e.source, target: e.target, active: e.active, payload: JSON.stringify(e) }));
    // Aggregation emits one row even for an empty group, allowing the next group to run.
    clauses.push("WITH count(*) AS processed", `UNWIND $${parameter} AS row`,
      "MATCH (source:Entity {id: row.source}), (target:Entity {id: row.target})",
      `MERGE (source)-[rel:${type} {id: row.id}]->(target) SET rel.payload = row.payload, rel.active = row.active`);
  }
  clauses.push("RETURN count(*) AS processed");
  return { query: clauses.join("\n"), params };
}
export class FalkorRepository implements Repository {
  mode = "falkordb" as const;
  private constructor(
    private graph: ReturnType<FalkorDB["selectGraph"]>,
    private connection: { isReady: boolean },
    private database: Pick<FalkorDB, "close">,
  ) {}
  isReady() {
    return this.connection.isReady;
  }
  async close() {
    await this.database.close();
  }
  static async connect(url: string, name: string) {
    if (!/^[a-zA-Z][a-zA-Z0-9_]{0,63}$/.test(name))
      throw new Error("Invalid FALKORDB_GRAPH name.");
    // Extra node-redis options are forwarded by the official SDK. Bound command
    // waits and reject disconnected writes rather than replaying them later.
    const connectionOptions = {
      url,
      socket: { connectTimeout: 8000, keepAlive: 5000 },
      pingInterval: 30000,
      disableOfflineQueue: true,
      commandOptions: { timeout: 10000 },
    };
    const db = await FalkorDB.connect(connectionOptions);
    const resetErrorReport = handleDatabaseErrors(db);
    const connection = await db.connection;
    connection.on("ready", resetErrorReport);
    const graph = db.selectGraph(name);
    try {
      // Existing workspaces can connect read-only, including when writes are capacity-limited.
      if (!(await db.list()).includes(name)) await graph.query("MERGE (m:RippleMeta {id: 'workspace'}) RETURN m.id");
      return new FalkorRepository(graph, connection, db);
    } catch (error) {
      await db.close();
      throw error;
    }
  }
  async read(): Promise<GraphState> {
    const [nodes, edges] = await Promise.all([
      this.graph.roQuery<{ payload: string }>(
        "MATCH (n:Entity) RETURN n.payload AS payload",
      ),
      this.graph.roQuery<{ payload: string }>(
        "MATCH (a:Entity)-[r]->(b:Entity) RETURN r.payload AS payload",
      ),
    ]);
    return {
      nodes: (nodes.data ?? []).map((row) => JSON.parse(String(row.payload))),
      edges: (edges.data ?? [])
        .filter((row) => row.payload)
        .map((row) => JSON.parse(String(row.payload))),
    };
  }
  async save(state: GraphState) {
    // A constant query shape prevents large per-workspace cached plans from filling Cloud memory.
    // One atomic query still upserts all records and preserves inactive relationships/history.
    const write = buildGraphWrite(state);
    await this.graph.query(write.query, { params: write.params });
  }
  async paths(target: string): Promise<EvidencePath[]> {
    const result = await this.graph.roQuery<{
      ids: string[];
      relations: string[];
    }>(IMPACT_QUERY, { params: { target } });
    return (result.data ?? []).map((row) => ({
      ids: row.ids as string[],
      relations: row.relations as string[],
    }));
  }
}

export async function createRepository(): Promise<Repository> {
  const mode = process.env.RIPPLE_MODE ?? "preview";
  if (!["preview", "falkordb"].includes(mode))
    throw new Error("RIPPLE_MODE must be preview or falkordb.");
  if (mode === "preview") return new PreviewRepository();
  if (!process.env.FALKORDB_URL)
    throw new Error("Set FALKORDB_URL in .env before using FalkorDB mode.");
  const repo = await FalkorRepository.connect(
    process.env.FALKORDB_URL,
    process.env.FALKORDB_GRAPH || "ripple_hackathon",
  );
  try {
    const state = await repo.read();
    if (!state.nodes.length) await repo.save(createSeed());
    else if (await upgradeWorkspace(state)) await repo.save(state);
    return repo;
  } catch (error) {
    await repo.close();
    throw error;
  }
}
