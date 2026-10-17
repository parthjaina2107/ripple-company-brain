import { createHash } from "node:crypto";
import type { Request, RequestHandler } from "express";
import { FalkorDB } from "falkordb";
import { DomainError } from "./domain.js";
import { handleDatabaseErrors } from "./database-lifecycle.js";

export interface RateStore {
  consume(key: string, windowMs: number, now: number): Promise<{ count: number; resetAt: number }>;
}
// A fixed key per identity/operation is reset atomically. Counters are shared by
// every function instance, rather than disappearing on a serverless cold start.
export const rateQuery = `MERGE (b:RequestBudget {key: $key})
ON CREATE SET b.count = 0, b.resetAt = 0
SET b.count = CASE WHEN b.resetAt <= $now THEN 1 ELSE b.count + 1 END,
    b.resetAt = CASE WHEN b.resetAt <= $now THEN $resetAt ELSE b.resetAt END
RETURN b.count AS count, b.resetAt AS resetAt`;

export class CloudRateStore implements RateStore {
  private connection?: Promise<FalkorDB>;
  constructor(public readonly graphName = process.env.RIPPLE_SECURITY_GRAPH || `ripple_security_${createHash("sha256").update(process.env.FALKORDB_GRAPH || "ripple_hackathon").digest("hex").slice(0, 16)}`) {
    if (!/^[a-zA-Z][a-zA-Z0-9_]{0,63}$/.test(graphName)) throw new Error("Invalid security graph name.");
  }
  private database() {
    if (!this.connection) {
      const options = { url: process.env.FALKORDB_URL, socket: { connectTimeout: 8000 }, disableOfflineQueue: true };
      this.connection = FalkorDB.connect(options).then((db) => { handleDatabaseErrors(db); return db; });
      this.connection.catch(() => { this.connection = undefined; });
    }
    return this.connection;
  }
  async consume(key: string, windowMs: number, now: number) {
    const graph = (await this.database()).selectGraph(this.graphName);
    // Keep expired counters from accumulating. This never touches company data.
    await graph.query("MATCH (b:RequestBudget) WHERE b.resetAt < $cutoff DELETE b", { params: { cutoff: now - 3600000 } });
    const result = await graph.query<{ count: number; resetAt: number }>(rateQuery, { params: { key, now, resetAt: now + windowMs } });
    const row = result.data?.[0];
    if (!row) throw new Error("Rate budget unavailable.");
    return { count: Number(row.count), resetAt: Number(row.resetAt) };
  }
  async close() { if (this.connection) await (await this.connection).close(); this.connection = undefined; }
}

class LocalRateStore implements RateStore {
  private buckets = new Map<string, { count: number; resetAt: number }>();
  async consume(key: string, windowMs: number, now: number) {
    for (const [id, row] of this.buckets) if (row.resetAt <= now) this.buckets.delete(id);
    const row = this.buckets.get(key) || { count: 0, resetAt: now + windowMs };
    row.count++;
    this.buckets.set(key, row);
    return { ...row };
  }
}

export function rateIdentity(req: Pick<Request, "headers" | "socket">): string {
  // Vercel sets this header. On a directly served local app, ignore forwarded
  // headers entirely so a caller cannot choose a different rate-limit identity.
  const trusted = process.env.VERCEL ? req.headers["x-real-ip"] : undefined;
  const ip = typeof trusted === "string" ? trusted : req.socket.remoteAddress || "unknown";
  return createHash("sha256").update(ip).digest("hex");
}

export function operationBudget(path: string) {
  if (path === "/api/judge/session") return { kind: "sandbox-session", max: 12, windowMs: 600000 };
  if (/(?:^|\/)research(?:\/[^/]+\/approve)?$/.test(path)) return { kind: "research", max: 3, windowMs: 60000 };
  if (path.endsWith("/ask")) return { kind: "ask", max: 30, windowMs: 60000 };
  return { kind: "write", max: 60, windowMs: 60000 };
}

export function apiRateLimit(store: RateStore): RequestHandler {
  return async (req, res, next) => {
    if (req.method !== "POST" || !req.path.startsWith("/api/") || req.path.startsWith("/api/auth/")) return next();
    const budget = operationBudget(req.path);
    try {
      const now = Date.now();
      const row = await store.consume(`${rateIdentity(req)}:${budget.kind}`, budget.windowMs, now);
      res.setHeader("RateLimit-Limit", budget.max);
      res.setHeader("RateLimit-Remaining", Math.max(0, budget.max - row.count));
      if (row.count > budget.max) {
        res.setHeader("Retry-After", Math.max(1, Math.ceil((row.resetAt - now) / 1000)));
        return void res.status(429).json({ error: "Too many requests. Wait for the Retry-After interval before trying again." });
      }
      next();
    } catch {
      // A broken shared limiter must not silently turn into unrestricted writes.
      next(new DomainError("Request protection is temporarily unavailable. Please retry shortly.", 503));
    }
  };
}

export const rateStore: RateStore = process.env.RIPPLE_MODE === "falkordb" ? new CloudRateStore() : new LocalRateStore();
