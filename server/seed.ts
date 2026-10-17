import type {
  Edge,
  Entity,
  GraphState,
  Relation,
  Scope,
} from "../shared/types.js";
import { policies, policyStatement, type PolicyTopic } from "../shared/policies.js";

export function edge(source: string, target: string, type: Relation): Edge {
  return {
    id: `${source}:${type}:${target}`,
    source,
    target,
    type,
    active: true,
  };
}

export function createSeed(): GraphState {
  const nodes: Entity[] = [
    {
      id: "topic-trial",
      kind: "policy",
      title: "Trial duration",
      status: "topic",
      content:
        "The shared topic connecting policy versions and their dependent knowledge.",
    },
    { id: "owner-product", kind: "owner", title: "Product team" },
    { id: "owner-support", kind: "owner", title: "Customer support" },
    { id: "owner-growth", kind: "owner", title: "Growth team" },
    { id: "owner-sales", kind: "owner", title: "Enterprise sales" },
    {
      id: "policy-trial",
      kind: "policy",
      title: "Self-serve trial policy · v1",
      content: "New self-serve customers receive a 14-day free trial.",
      scope: "new",
      value: 14,
      status: "approved",
      effectiveFrom: "2026-10-01",
      ownerId: "owner-product",
    },
    {
      id: "policy-enterprise",
      kind: "policy",
      title: "Enterprise trial agreement",
      content:
        "Enterprise customers receive a 14-day trial under a separate agreement.",
      scope: "enterprise",
      value: 14,
      status: "approved",
      effectiveFrom: "2026-10-01",
      ownerId: "owner-sales",
    },
  ];
  const edges: Edge[] = [
    edge("policy-trial", "topic-trial", "DEPENDS_ON"),
    edge("policy-enterprise", "topic-trial", "DEPENDS_ON"),
  ];
  const add = (
    id: string,
    title: string,
    kind: "document" | "memory" | "workflow",
    content: string,
    scope: Scope,
    ownerId: string,
    value?: number,
    dependency = "policy-trial",
  ) => {
    nodes.push({
      id,
      kind,
      title,
      content,
      scope,
      ownerId,
      revision: 1,
      status: "current",
      createdAt: "2026-10-12T09:00:00Z",
    });
    edges.push(edge(id, ownerId, "OWNED_BY"));
    if (value !== undefined) {
      const quote =
        content.match(/[^.!?]*\b14[- ]day[^.!?]*[.!?]?/i)?.[0]?.trim() ||
        content;
      const claimId = `${id}-claim`;
      nodes.push({
        id: claimId,
        kind: "claim",
        title: `${value}-day trial claim`,
        value,
        scope,
        quote,
        sourceId: id,
        status: "current",
        extractionMethod: "reviewed seed",
      });
      edges.push(
        edge(id, claimId, "ASSERTS"),
        edge(claimId, dependency, "DEPENDS_ON"),
      );
    } else edges.push(edge(id, dependency, "DEPENDS_ON"));
  };
  add(
    "doc-onboarding",
    "Getting started guide",
    "document",
    "Welcome to Acme. New self-serve customers get a 14-day free trial. Create a workspace and invite your team.",
    "new",
    "owner-product",
    14,
  );
  add(
    "doc-support",
    "Trial support playbook",
    "document",
    "New self-serve customers receive a 14-day trial. Explain the trial period before discussing an upgrade.",
    "new",
    "owner-support",
    14,
  );
  add(
    "doc-faq",
    "Sales FAQ",
    "document",
    "Our new self-serve customers can explore Acme with a 14-day free trial. No credit card is required.",
    "new",
    "owner-growth",
    14,
  );
  add(
    "doc-email",
    "Welcome email template",
    "document",
    "Your new self-serve workspace includes a 14-day trial. Start by creating your first project.",
    "new",
    "owner-growth",
    14,
  );
  add(
    "memory-answer",
    "Saved onboarding answer",
    "memory",
    "For a new self-serve account, the free trial lasts 14 days.",
    "new",
    "owner-support",
    14,
  );
  add(
    "flow-reminder",
    "Trial reminder sequence",
    "workflow",
    "Schedule upgrade reminders using the trial window described in the getting started guide.",
    "new",
    "owner-growth",
    undefined,
    "doc-onboarding",
  );
  add(
    "flow-escalation",
    "Trial extension escalation",
    "workflow",
    "Use the support playbook to decide when a trial extension needs product review.",
    "new",
    "owner-support",
    undefined,
    "doc-support",
  );
  add(
    "flow-handoff",
    "Sales-to-support handoff",
    "workflow",
    "Attach the sales FAQ when handing a self-serve trial conversation to support.",
    "new",
    "owner-sales",
    undefined,
    "doc-faq",
  );
  add(
    "doc-enterprise",
    "Enterprise agreement guide",
    "document",
    "Enterprise customers receive a 14-day trial under their separate agreement.",
    "enterprise",
    "owner-sales",
    14,
    "policy-enterprise",
  );
  add(
    "doc-enterprise-faq",
    "Enterprise sales notes",
    "document",
    "Enterprise contracts retain their negotiated 14-day trial.",
    "enterprise",
    "owner-sales",
    14,
    "policy-enterprise",
  );
  // Related, but outside the changed audience: this should be preserved, not rewritten.
  edges.push(edge("doc-enterprise", "policy-trial", "DEPENDS_ON"));
  add(
    "doc-security",
    "Workspace security checklist",
    "document",
    "Enable two-factor authentication and assign workspace owners before inviting a team.",
    "all",
    "owner-product",
    undefined,
    "owner-product",
  );
  add(
    "doc-brand",
    "Voice and tone",
    "document",
    "Be clear, useful, and human. Explain the next step without jargon.",
    "all",
    "owner-growth",
    undefined,
    "owner-growth",
  );
  edges.push(
    edge("policy-trial", "owner-product", "OWNED_BY"),
    edge("policy-enterprise", "owner-sales", "OWNED_BY"),
  );
  const state = { nodes, edges };
  expandCompanyKnowledge(state);
  return state;
}

/** Additive, idempotent sample-data upgrade. Never replace user records. */
export function expandCompanyKnowledge(state: GraphState): boolean {
  let changed = false;
  const addNode = (node: Entity) => {
    if (!state.nodes.some((n) => n.id === node.id)) { state.nodes.push(node); changed = true; }
  };
  const addEdge = (source: string, target: string, type: Relation) => {
    const item = edge(source, target, type);
    if (!state.edges.some((e) => e.id === item.id)) { state.edges.push(item); changed = true; }
  };
  for (const topic of ["refund_window", "cancellation_notice", "support_response"] as PolicyTopic[]) {
    const config = policies[topic];
    // A root marks an installed topic; do not resurrect missing/edited sample content later.
    if (state.nodes.some((n) => n.id === config.root)) continue;
    addNode({ id: config.root, kind: "policy", title: config.label, topic, status: "topic", content: `Company knowledge about ${config.label.toLowerCase()}.` });
    for (const scope of ["new", "enterprise"] as const) {
      const value = scope === "enterprise" ? (topic === "support_response" ? 4 : 60) : config.initial;
      const policyId = `policy-${topic}-${scope}`;
      const ownerId = scope === "enterprise" ? "owner-sales" : "owner-support";
      addNode({ id: policyId, kind: "policy", topic, title: `${config.label} · ${scope === "new" ? "self-serve" : "enterprise"}`, content: policyStatement(topic, value, scope), value, scope, ownerId, status: "approved", effectiveFrom: "2026-10-01" });
      addEdge(policyId, config.root, "DEPENDS_ON");
      addEdge(policyId, ownerId, "OWNED_BY");
      const sourceId = `doc-${topic}-${scope}`;
      const quote = policyStatement(topic, value, scope);
      addNode({ id: sourceId, kind: "document", topic, title: `${scope === "new" ? "Self-serve" : "Enterprise"} ${config.label.toLowerCase()} guide`, content: `${quote} Contact the account owner for help.`, scope, ownerId, revision: 1, status: "current", createdAt: "2026-10-12T09:00:00Z" });
      const claimId = `${sourceId}-claim`;
      addNode({ id: claimId, kind: "claim", topic, title: `${config.label}: ${value} ${config.unit}`, value, scope, quote, sourceId, status: "current", extractionMethod: "reviewed seed" });
      addEdge(sourceId, ownerId, "OWNED_BY");
      addEdge(sourceId, claimId, "ASSERTS");
      addEdge(claimId, policyId, "DEPENDS_ON");
      if (scope === "new") {
        const memoryId = `memory-${topic}`;
        const memoryClaimId = `${memoryId}-claim`;
        addNode({ id: memoryId, kind: "memory", topic, title: `Saved ${config.label.toLowerCase()} answer`, content: quote, scope, ownerId, revision: 1, status: "current" });
        addNode({ id: memoryClaimId, kind: "claim", topic, title: `${config.label}: ${value} ${config.unit}`, value, scope, quote, sourceId: memoryId, status: "current", extractionMethod: "reviewed seed" });
        addEdge(memoryId, memoryClaimId, "ASSERTS");
        addEdge(memoryClaimId, policyId, "DEPENDS_ON");
        addEdge(memoryId, ownerId, "OWNED_BY");
        const flowId = `flow-${topic}`;
        addNode({ id: flowId, kind: "workflow", topic, title: `${config.label} handling workflow`, content: `Use the self-serve ${config.label.toLowerCase()} guide when handling requests. Review timings and customer communications when the policy changes.`, scope, ownerId, revision: 1, status: "current" });
        addEdge(flowId, sourceId, "DEPENDS_ON");
        addEdge(flowId, ownerId, "OWNED_BY");
      }
    }
  }
  return changed;
}
