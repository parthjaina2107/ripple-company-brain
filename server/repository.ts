import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { FalkorDB } from "falkordb";
import type { EvidencePath, GraphState, Relation } from "../shared/types.js";
import { createSeed, expandCompanyKnowledge } from "./seed.js";
import { handleDatabaseErrors } from "./database-lifecycle.js";

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
      if (expandCompanyKnowledge(state)) await this.save(state);
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
    // A new Cloud instance has no graph key yet; create our workspace marker before RO_QUERY.
    await graph.query("MERGE (m:RippleMeta {id: 'workspace'}) RETURN m.id");
    return new FalkorRepository(graph, connection, db);
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
    // One write query: nodes/edges are upserted together, never delete-and-reseed.
    // Model/user text is passed only as parameters. Relationship types are allowlisted.
    const params: Record<string, string | boolean> = {};
    const clauses: string[] = [];
    state.nodes.forEach((node, i) => {
      params[`id${i}`] = node.id;
      params[`p${i}`] = JSON.stringify(node);
      params[`k${i}`] = node.kind;
      clauses.push(
        `MERGE (n${i}:Entity {id: $id${i}}) SET n${i}.payload = $p${i}, n${i}.kind = $k${i}`,
      );
    });
    const indices = new Map(state.nodes.map((n, i) => [n.id, i]));
    state.edges.forEach((e, i) => {
      if (
        !allowedRelations.includes(e.type) ||
        !indices.has(e.source) ||
        !indices.has(e.target)
      )
        throw new Error("Invalid graph edge.");
      params[`eid${i}`] = e.id;
      params[`ep${i}`] = JSON.stringify(e);
      params[`active${i}`] = e.active;
      clauses.push(
        `MERGE (n${indices.get(e.source)})-[r${i}:${e.type} {id: $eid${i}}]->(n${indices.get(e.target)}) SET r${i}.payload = $ep${i}, r${i}.active = $active${i}`,
      );
    });
    await this.graph.query(clauses.join("\n"), { params });
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
  const state = await repo.read();
  if (!state.nodes.length) await repo.save(createSeed());
  else if (expandCompanyKnowledge(state)) await repo.save(state);
  return repo;
}
