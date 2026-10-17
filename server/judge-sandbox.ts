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

export async function sandboxService(graph: string) {
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
    let active = 0;
    for (const name of await db.list()) {
      const match = name.match(ownPattern);
      if (!match) continue;
      if (Number(match[1]) > now) { active++; continue; }
      // Only expired graphs in this dedicated sandbox namespace are disposable.
      const cached = services.get(name);
      services.delete(name);
      if (cached) await cached.then((service) => (service.repo as FalkorRepository).close()).catch(() => {});
      await db.selectGraph(name).delete();
    }
    if (active >= 10) throw new DomainError("All ten judge sandboxes are currently in use. Please try later; the shared Acme tour is still available.", 503);
    const graph = `${prefix()}${now + sandboxLifetime}_${randomBytes(12).toString("hex")}`;
    const repo = await FalkorRepository.connect(process.env.FALKORDB_URL, graph);
    try { await repo.save(createSeed()); }
    catch (error) { await repo.close(); await db.selectGraph(graph).delete(); throw error; }
    services.set(graph, Promise.resolve(new RippleService(repo)));
    return { graph, token: sandboxToken(graph, signingKey) };
  } finally { await db.close(); }
}

export function sandboxOperationAllowed(method: string, path: string) {
  if (method === "GET") return /^\/(workspace|research|reviews\/[^/]+\/export)$/.test(path);
  return method === "POST" && /^\/(ask|decisions|decisions\/[^/]+\/analyze|reviews\/[^/]+\/(apply|resolve)|documents|documents\/extract|research|research\/[^/]+\/approve)$/.test(path);
}
