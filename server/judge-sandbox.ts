import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { FalkorDB } from "falkordb";
import { DomainError } from "./domain.js";
import { FalkorRepository } from "./repository.js";
import { createSeed } from "./seed.js";
import { RippleService } from "./service.js";
import type { CompanyProfile } from "../shared/types.js";

export const sandboxCookie = "ripple_judge_v1";
export const sandboxLifetime = 2 * 60 * 60 * 1000;
const services = new Map<string, Promise<RippleService>>();
function prefix() {
  return `rj_${createHash("sha256").update(process.env.FALKORDB_GRAPH || "ripple_hackathon").digest("hex").slice(0, 8)}_`;
}
function secret() {
  const value = process.env.RIPPLE_SANDBOX_SECRET;
  if (!value || value.length < 32) throw new DomainError("Interactive sandboxes are not configured yet. The Acme tour is still available.", 503);
  return value;
}
export function sandboxToken(graph: string, key: string) {
  return `${graph}.${createHmac("sha256", key).update(graph).digest("hex")}`;
}
export function verifySandboxToken(token: string, key: string, expectedPrefix: string, now = Date.now()): string {
  const [graph, signature, extra] = token.split(".");
  if (extra || !graph?.startsWith(expectedPrefix) || !/^rj_[a-f0-9]{8}_\d{13}_[a-f0-9]{24}$/.test(graph) || !/^[a-f0-9]{64}$/.test(signature || ""))
    throw new DomainError("Start your own judge sandbox to continue.", 401);
  const expected = sandboxToken(graph, key).split(".")[1];
  if (!timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expected, "hex")))
    throw new DomainError("Start your own judge sandbox to continue.", 401);
  const expires = Number(graph.split("_")[2]);
  if (expires <= now || expires > now + sandboxLifetime + 60000)
    throw new DomainError("Your two-hour judge sandbox has expired. Return to Acme and start a new sandbox.", 410);
  return graph;
}
export function graphFromCookie(cookie = "") {
  const token = cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${sandboxCookie}=`))?.slice(sandboxCookie.length + 1);
  if (!token) throw new DomainError("Start your own judge sandbox to continue.", 401);
  return verifySandboxToken(token, secret(), prefix());
}
export const sandboxCompany: CompanyProfile = { id: "judge-sandbox", name: "Acme sandbox", website: "", sandbox: true };
function registryName() { return `ripple_sandbox_registry_${prefix().slice(3, 11)}`; }
export async function cleanupExpiredSandboxes() {
  const options = { url: process.env.FALKORDB_URL!, socket: { connectTimeout: 8000 }, disableOfflineQueue: true };
  const db = await FalkorDB.connect(options);
  (await db.connection).on("error", () => {});
  try {
    const pattern = new RegExp(`^${prefix()}(\\d{13})_[a-f0-9]{24}$`);
    for (const name of await db.list()) {
      const match = name.match(pattern);
      if (match && Number(match[1]) <= Date.now()) await db.selectGraph(name).delete();
    }
    await db.selectGraph(registryName()).query("MATCH (l:Lease) WHERE l.expires <= $now DELETE l", { params: { now: Date.now() } });
  } finally { await db.close(); }
}

export async function releaseSandbox(cookie?: string) {
  const graph = graphFromCookie(cookie);
  const options = { url: process.env.FALKORDB_URL!, socket: { connectTimeout: 8000 }, disableOfflineQueue: true };
  const db = await FalkorDB.connect(options);
  (await db.connection).on("error", () => {});
  try {
    const cached = services.get(graph); services.delete(graph);
    if (cached) await cached.then((service) => (service.repo as FalkorRepository).close()).catch(() => {});
    if ((await db.list()).includes(graph)) await db.selectGraph(graph).delete();
    await db.selectGraph(registryName()).query("MATCH (l:Lease {name: $name}) DELETE l", { params: { name: graph } });
  } finally { await db.close(); }
}

export async function sandboxService(graph: string) {
  // Expired capabilities cannot retain an unbounded pool of warm clients.
  for (const [name, cached] of services) if (Number(name.split("_")[2]) < Date.now()) {
    services.delete(name); void cached.then((service) => (service.repo as FalkorRepository).close()).catch(() => {});
  }
  let pending = services.get(graph);
  if (!pending) {
    pending = (async () => {
      const repo = await FalkorRepository.connect(process.env.FALKORDB_URL!, graph);
      if (!(await repo.read()).nodes.length) {
        await repo.close();
        throw new DomainError("This sandbox is no longer available. Return to Acme and start again.", 410);
      }
      return new RippleService(repo);
    })();
    services.set(graph, pending);
    pending.catch(() => services.delete(graph));
  }
  return pending;
}

export async function startSandbox(cookie?: string) {
  const signingKey = secret();
  if (cookie) {
    try {
      const graph = graphFromCookie(cookie);
      await sandboxService(graph);
      return { graph, token: sandboxToken(graph, signingKey) };
    } catch (error) {
      if (!(error instanceof DomainError) || ![401, 410].includes(error.status)) throw error;
    }
  }
  if (process.env.RIPPLE_MODE !== "falkordb" || !process.env.FALKORDB_URL)
    throw new DomainError("Judge sandboxes require live FalkorDB.", 503);
  const connectionOptions = { url: process.env.FALKORDB_URL, socket: { connectTimeout: 8000 }, disableOfflineQueue: true };
  const db = await FalkorDB.connect(connectionOptions);
  (await db.connection).on("error", () => {});
  try {
    const ownPattern = new RegExp(`^${prefix()}(\\d{13})_[a-f0-9]{24}$`);
    const now = Date.now();
    const active: string[] = [];
    for (const name of await db.list()) {
      const match = name.match(ownPattern);
      if (!match) continue;
      if (Number(match[1]) > now) { active.push(name); continue; }
      // Only expired graphs in this dedicated sandbox namespace are disposable.
      const cached = services.get(name);
      services.delete(name);
      if (cached) await cached.then((service) => (service.repo as FalkorRepository).close()).catch(() => {});
      await db.selectGraph(name).delete();
    }
    const graph = `${prefix()}${now + sandboxLifetime}_${randomBytes(12).toString("hex")}`;
    const registry = db.selectGraph(registryName());
    await registry.query("MATCH (l:Lease) WHERE l.expires <= $now DELETE l", { params: { now } });
    // Register pre-upgrade graphs without changing their contents or expiry.
    if (active.length) await registry.query("UNWIND $leases AS row MERGE (l:Lease {name: row.name}) SET l.expires = row.expires", { params: { leases: active.map((name) => ({ name, expires: Number(name.split("_")[2]) })) } });
    const reserved = await registry.query<{ name: string }>("MATCH (l:Lease) WITH count(l) AS used WHERE used < 10 CREATE (reservation:Lease {name: $name, expires: $expires}) RETURN reservation.name AS name", { params: { name: graph, expires: now + sandboxLifetime } });
    if (!reserved.data?.length) throw new DomainError("All ten judge sandboxes are in use. Existing visitors can resume; use the Acme tour or retry later. Finish & release frees your slot.", 503);
    let repo: FalkorRepository;
    try { repo = await FalkorRepository.connect(process.env.FALKORDB_URL, graph); }
    catch (error) { await registry.query("MATCH (l:Lease {name: $name}) DELETE l", { params: { name: graph } }); throw error; }
    try { await repo.save(createSeed()); }
    catch (error) { await repo.close(); await db.selectGraph(graph).delete(); await registry.query("MATCH (l:Lease {name: $name}) DELETE l", { params: { name: graph } }); throw error; }
    services.set(graph, Promise.resolve(new RippleService(repo)));
    return { graph, token: sandboxToken(graph, signingKey) };
  } finally { await db.close(); }
}

export function sandboxOperationAllowed(method: string, path: string) {
  if (method === "GET") return /^\/(workspace|research|reviews\/[^/]+\/export)$/.test(path);
  return method === "POST" && /^\/(ask|decisions|decisions\/[^/]+\/analyze|reviews\/[^/]+\/(apply|resolve|publish)|documents|documents\/extract|research|research\/[^/]+\/approve)$/.test(path);
}
