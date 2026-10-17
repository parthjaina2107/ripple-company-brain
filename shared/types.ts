import type { PolicyTopic } from "./policies.js";
export type Scope = "new" | "enterprise" | "all";
export type Kind =
  | "policy"
  | "document"
  | "workflow"
  | "memory"
  | "claim"
  | "owner"
  | "decision"
  | "review"
  | "correction"
  | "research";
export type Classification = "conflict" | "review" | "unaffected";
export type Relation =
  "DEPENDS_ON" | "ASSERTS" | "OWNED_BY" | "SUPERSEDES" | "CREATES" | "REPAIRS";

export interface Entity {
  sourceUrl?: string;
  retrievedAt?: string;
  sourceSystem?: string;
  originalTitle?: string;
  sampleVersion?: number;
  topic?: PolicyTopic;
  id: string;
  kind: Kind;
  title: string;
  content?: string;
  scope?: Scope;
  value?: number;
  status?: string;
  effectiveFrom?: string;
  createdAt?: string;
  sourceId?: string;
  quote?: string;
  policyId?: string;
  ownerId?: string;
  decisionId?: string;
  artifactId?: string;
  classification?: Classification;
  reason?: string;
  path?: string[];
  original?: string;
  proposed?: string;
  sourceRevision?: number;
  revision?: number;
  extractionMethod?: string;
}
export interface Edge {
  id: string;
  source: string;
  target: string;
  type: Relation;
  active: boolean;
}
export interface GraphState {
  nodes: Entity[];
  edges: Edge[];
}
export interface EvidencePath {
  ids: string[];
  relations: string[];
}
export interface Impact {
  artifact: Entity;
  classification: Classification;
  reason: string;
  path: EvidencePath;
  claim?: Entity;
  owner?: Entity;
  reviewId?: string;
}
export interface TraceStep {
  tool: string;
  detail: string;
  count: number;
}
export interface Analysis {
  asOf?: string;
  decision: Entity;
  policy?: Entity;
  impacts: Impact[];
  trace: TraceStep[];
  notice?: string;
}
export interface Health {
  storage: "preview" | "falkordb";
  connected: boolean;
  model: string | null;
  graphName: string;
}
export interface Workspace {
  company?: CompanyProfile;
  graph: GraphState;
  health: Health;
}

export interface CompanyProfile { id: string; name: string; website: string; demo?: boolean; sandbox?: boolean; }
export interface CorrectionExport {
  fileBase: string;
  markdown: string;
  packet: {
    schemaVersion: 1; company: { id: string; name: string }; reviewId: string; correctionId: string; approvedAt: string | null;
    source: { id: string; title: string; url: string | null; revisionBefore: number; revisionAfter: number };
    policy: { id: string; area: string; value: number; unit: string; audience: Scope; effectiveFrom: string };
    decision: { id: string; title: string };
    evidence: Array<{ id: string; title: string; relationshipToNext: string | null }>;
    original: string; corrected: string; contentSha256: string; externalPublication: false; instructions: string;
  };
}
export interface ResearchPage { url: string; title: string; text: string; retrievedAt: string; }
export interface PolicyFinding { id: string; topic: import("./policies.js").PolicyTopic; value: number; quote: string; sourceUrl: string; scope?: Scope; }
export interface ResearchResult { id: string; website: string; pages: ResearchPage[]; findings: PolicyFinding[]; warnings: string[]; createdAt: string; approved?: boolean; }
export interface DecisionInput {
  topic?: PolicyTopic;
  title: string;
  value: number;
  scope: Scope;
  effectiveFrom: string;
  status: "approved" | "proposed";
  asOf: string;
}
export interface ExtractedClaim {
  topic?: PolicyTopic;
  value: number;
  scope: Scope;
  quote: string;
}
export interface Extraction {
  title: string;
  content: string;
  claims: ExtractedClaim[];
  method: string;
  warning?: string;
}
export interface Answer {
  text: string;
  sources: Entity[];
  paths: EvidencePath[];
  trace: TraceStep[];
  mode: "model" | "structured" | "guidance";
  asOf: string;
}
