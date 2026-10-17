import { createHash } from "node:crypto";
import { resolve } from "node:path";
import type { CompanyProfile, GraphState } from "../shared/types.js";
import { policies, policyTopics } from "../shared/policies.js";
import { FalkorRepository, PreviewRepository, type Repository } from "./repository.js";
import { RippleService } from "./service.js";

export function companyGraphName(companyId: string) {
  if (!companyId || companyId.length > 200) throw new Error("Invalid company identifier.");
  const base = (process.env.FALKORDB_GRAPH || "ripple_hackathon").slice(0, 35);
  return `${base}_c_${createHash("sha256").update(companyId).digest("hex").slice(0, 20)}`;
}

export function createCompanySeed(company: CompanyProfile): GraphState {
  return { nodes: [
    ...policyTopics.map((topic) => ({ id: policies[topic].root, kind: "policy" as const, topic, title: policies[topic].label, status: "topic", sampleVersion: 2 })),
    { id: "owner-company", kind: "owner", title: `${company.name} policy owner` },
  ], edges: [] };
}

export class CompanyWorkspaces {
  private services = new Map<string, Promise<RippleService>>();
  constructor(private factory?: (company: CompanyProfile) => Promise<Repository>) {}
  async get(company: CompanyProfile): Promise<RippleService> {
    let service = this.services.get(company.id);
    if (!service) {
      service = this.create(company);
      this.services.set(company.id, service);
      service.catch(() => this.services.delete(company.id));
    }
    return service;
  }
  private async create(company: CompanyProfile) {
    let repo: Repository;
    if (this.factory) repo = await this.factory(company);
    else if ((process.env.RIPPLE_MODE || "preview") === "preview")
      repo = new PreviewRepository(resolve(".data/companies", `${companyGraphName(company.id)}.json`), () => createCompanySeed(company));
    else {
      if (!process.env.FALKORDB_URL) throw new Error("Company database connection is not configured.");
      const cloud = await FalkorRepository.connect(process.env.FALKORDB_URL, companyGraphName(company.id));
      try { if (!(await cloud.read()).nodes.length) await cloud.save(createCompanySeed(company)); }
      catch (error) { await cloud.close(); throw error; }
      repo = cloud;
    }
    return new RippleService(repo);
  }
}
