import { randomUUID } from "node:crypto";
import type {
  Analysis,
  DecisionInput,
  Entity,
  EvidencePath,
  GraphState,
  Impact,
  Scope,
} from "../shared/types.js";
import { edge } from "./seed.js";
import { policies, policyStatement, topicOf, type PolicyTopic } from "../shared/policies.js";

export function applicablePolicy(
  state: GraphState,
  scope: Scope,
  asOf: string,
  topic: PolicyTopic = "trial_duration",
): Entity | undefined {
  return state.nodes
    .filter(
      (n) =>
        n.kind === "policy" &&
        topicOf(n) === topic &&
        n.status === "approved" &&
        n.value !== undefined &&
        n.effectiveFrom! <= asOf &&
        (n.scope === scope || n.scope === "all"),
    )
    .sort(
      (a, b) =>
        b.effectiveFrom!.localeCompare(a.effectiveFrom!) ||
        (b.createdAt || "").localeCompare(a.createdAt || "") ||
        (b.revision || 0) - (a.revision || 0) ||
        Number(b.scope === scope) - Number(a.scope === scope),
    )[0];
}

export function addDecision(state: GraphState, input: DecisionInput): Entity {
  const now = new Date().toISOString();
  const id = randomUUID();
  const topic = topicOf(input);
  const previous = applicablePolicy(state, input.scope, input.effectiveFrom, topic);
  const policy: Entity = {
    id: `policy-${id}`,
    kind: "policy",
    topic,
    title: input.title,
    value: input.value,
    scope: input.scope,
    effectiveFrom: input.effectiveFrom,
    status: input.status,
    createdAt: now,
    revision:
      Math.max(
        0,
        ...state.nodes
          .filter((n) => n.kind === "policy")
          .map((n) => n.revision || 0),
      ) + 1,
    content: policyStatement(topic, input.value, input.scope),
  };
  const decision: Entity = {
    ...policy,
    id: `decision-${id}`,
    kind: "decision",
    policyId: policy.id,
    content: `Change ${policies[topic].label.toLowerCase()} to ${input.value} ${policies[topic].unit} for ${input.scope} customers.`,
    sourceId: previous?.id,
  };
  state.nodes.push(policy, decision);
  state.edges.push(
    edge(policy.id, policies[topic].root, "DEPENDS_ON"),
    edge(decision.id, policy.id, "CREATES"),
  );
  if (previous) state.edges.push(edge(policy.id, previous.id, "SUPERSEDES"));
  return decision;
}

export function analyze(
  state: GraphState,
  decision: Entity,
  paths: EvidencePath[],
  asOf: string,
): Analysis {
  const policy = state.nodes.find((n) => n.id === decision.policyId);
  if (!policy) throw new Error("Decision has no policy version.");
  const topic = topicOf(policy);
  const applicable = applicablePolicy(state, policy.scope!, asOf, topic);
  const active =
    policy.status === "approved" &&
    policy.effectiveFrom! <= asOf &&
    applicable?.id === policy.id;
  const notice =
    policy.status !== "approved"
      ? "This decision is proposed. It does not override approved knowledge."
      : policy.effectiveFrom! > asOf
        ? `This decision takes effect on ${policy.effectiveFrom}. No current corrections were created.`
        : applicable?.id !== policy.id
          ? "A different approved policy is applicable on this date. This decision cannot create current corrections."
          : undefined;
  const byId = new Map(state.nodes.map((n) => [n.id, n]));
  const byArtifact = new Map<string, EvidencePath>();
  for (const path of paths) {
    const item = byId.get(path.ids[0]);
    if (!item || !["document", "workflow", "memory"].includes(item.kind))
      continue;
    const existing = byArtifact.get(item.id);
    // Prefer a claim-bearing path because it provides the source for contradiction checks.
    if (
      !existing ||
      (path.ids.some((id) => byId.get(id)?.kind === "claim") &&
        !existing.ids.some((id) => byId.get(id)?.kind === "claim")) ||
      (path.ids.length < existing.ids.length &&
        path.ids.some((id) => byId.get(id)?.kind === "claim") ===
          existing.ids.some((id) => byId.get(id)?.kind === "claim"))
    )
      byArtifact.set(item.id, path);
  }
  const impacts: Impact[] = [];
  for (const [id, path] of byArtifact) {
    const artifact = byId.get(id)!;
    // A downstream document's claim is evidence for dependency, not a claim made by this artifact.
    const claim = path.ids
      .map((id) => byId.get(id))
      .find(
        (n) =>
          n?.kind === "claim" &&
          topicOf(n) === topic &&
          n.status === "current" &&
          n.sourceId === artifact.id,
      );
    const directClaims = state.edges
      .filter(
        (e) => e.active && e.type === "ASSERTS" && e.source === artifact.id,
      )
      .map((e) => byId.get(e.target))
      .filter((n) => n?.status === "current" && topicOf(n) === topic);
    let classification: Impact["classification"] = "review";
    let reason =
      "This workflow depends on changed knowledge. Its behavior needs an owner review; a dependency alone does not prove a contradiction.";
    if (!active) {
      classification = "unaffected";
      reason = notice!;
    } else if (
      policy.scope !== "all" &&
      artifact.scope !== "all" &&
      artifact.scope !== policy.scope
    ) {
      classification = "unaffected";
      reason = `This item applies to ${artifact.scope} customers. The change applies to ${policy.scope} customers.`;
    } else if (artifact.scope === "all" && policy.scope !== "all") {
      classification = "review";
      reason =
        "This item covers multiple customer groups. Review its scope before making a targeted correction.";
    } else if (
      artifact.scope !== "all" &&
      applicablePolicy(state, artifact.scope!, asOf, topic)?.id !== policy.id
    ) {
      classification = "unaffected";
      reason =
        "A different approved policy is applicable to this audience on the selected date.";
    } else if (
      artifact.scope === "all" &&
      ["new", "enterprise"].some(
        (s) => applicablePolicy(state, s as Scope, asOf, topic)?.id !== policy.id,
      )
    ) {
      classification = "review";
      reason =
        "Customer groups have different applicable policy versions. Review this shared source before changing it.";
    } else if (directClaims.length > 1) {
      classification = "review";
      reason =
        "This source contains multiple claims for this topic. An owner must reconcile them before a targeted correction can be proposed.";
    } else if (claim && claim.value === policy.value) {
      classification = "unaffected";
      reason = `Its ${policies[topic].label.toLowerCase()} claim (${claim.value} ${policies[topic].unit}) already agrees with the applicable policy.`;
    } else if (
      claim &&
      claim.scope === artifact.scope &&
      claim.quote &&
      artifact.content?.includes(claim.quote)
    ) {
      classification = "conflict";
      reason = `The source states ${claim.value} ${policies[topic].unit} for ${claim.scope} customers; the approved ${policies[topic].label.toLowerCase()} policy states ${policy.value} ${policies[topic].unit}, effective ${policy.effectiveFrom}.`;
    }
    impacts.push({
      artifact,
      claim,
      classification,
      reason,
      path,
      owner: byId.get(artifact.ownerId || ""),
    });
  }
  return {
    decision,
    policy,
    impacts: impacts.sort(
      (a, b) =>
        ["conflict", "review", "unaffected"].indexOf(a.classification) -
          ["conflict", "review", "unaffected"].indexOf(b.classification) ||
        a.artifact.title.localeCompare(b.artifact.title),
    ),
    notice,
    trace: [
      {
        tool: "get_applicable_policy",
        detail: `${policies[topic].label} · ${policy.scope} customers · as of ${asOf}`,
        count: applicable ? 1 : 0,
      },
      {
        tool: "find_dependent_content",
        detail: "Follow ASSERTS / DEPENDS_ON relationships, up to 6 hops",
        count: paths.length,
      },
      {
        tool: "classify_with_evidence",
        detail: "Check approval, date, audience, source quote, and claim value",
        count: impacts.length,
      },
    ],
  };
}

export function createReviews(state: GraphState, analysis: Analysis) {
  for (const impact of analysis.impacts) {
    if (impact.classification === "unaffected") continue;
    const id = `review:${analysis.decision.id}:${impact.artifact.id}`;
    const existing = state.nodes.find((n) => n.id === id);
    if (!existing || ["pending", "stale"].includes(existing.status || "")) {
      const claim = impact.claim;
      const replacement = claim?.quote?.replace(
        new RegExp(`\\b${claim.value}(?=[- ]${topicOf(analysis.policy!) === "support_response" ? "hours?" : "days?"}\\b)`, "gi"),
        String(analysis.policy!.value),
      );
      const proposed =
        impact.classification === "conflict" && replacement !== claim?.quote
          ? impact.artifact.content!.replace(claim!.quote!, replacement!)
          : undefined;
      const record: Entity = {
        id,
        kind: "review",
        topic: topicOf(analysis.policy!),
        title: impact.artifact.title,
        artifactId: impact.artifact.id,
        decisionId: analysis.decision.id,
        policyId: analysis.policy!.id,
        status: "pending",
        classification: impact.classification,
        reason: impact.reason,
        path: impact.path.ids,
        original: impact.artifact.content,
        proposed,
        sourceRevision: impact.artifact.revision,
        createdAt: existing?.createdAt || new Date().toISOString(),
      };
      if (existing) Object.assign(existing, record);
      else {
        state.nodes.push(record);
        state.edges.push(
          edge(analysis.decision.id, id, "CREATES"),
          edge(id, impact.artifact.id, "REPAIRS"),
        );
      }
    }
    impact.reviewId = id;
  }
}

export class DomainError extends Error {
  constructor(
    message: string,
    public status = 409,
  ) {
    super(message);
  }
}

export function applyCorrection(
  state: GraphState,
  reviewId: string,
  asOf: string,
) {
  const review = state.nodes.find(
    (n) => n.id === reviewId && n.kind === "review",
  );
  if (!review) throw new DomainError("Review not found.", 404);
  if (review.status === "applied") return review;
  if (review.status !== "pending")
    throw new DomainError("This review has already been resolved.");
  if (review.classification !== "conflict" || !review.proposed)
    throw new DomainError(
      "This dependency needs a human review, not an automatic text correction.",
    );
  const artifact = state.nodes.find((n) => n.id === review.artifactId)!;
  const policy = state.nodes.find((n) => n.id === review.policyId)!;
  if (applicablePolicy(state, artifact.scope!, asOf, topicOf(policy))?.id !== policy.id)
    throw new DomainError(
      "Policy applicability has changed. Analyze the latest decision before applying.",
    );
  if (
    artifact.revision !== review.sourceRevision ||
    artifact.content !== review.original
  )
    throw new DomainError(
      "The source has changed since analysis. Re-analyze before applying.",
    );
  const oldClaimEdges = state.edges.filter(
    (e) => e.active && e.source === artifact.id && e.type === "ASSERTS",
  );
  const originalClaim = oldClaimEdges.map((e) => state.nodes.find((n) => n.id === e.target)!)
    .find((claim) => topicOf(claim) === topicOf(policy));
  for (const e of oldClaimEdges) {
    const claim = state.nodes.find((n) => n.id === e.target)!;
    if (topicOf(claim) !== topicOf(policy)) continue;
    claim.status = "superseded";
    e.active = false;
  }
  artifact.content = review.proposed;
  artifact.revision = (artifact.revision || 1) + 1;
  const claimId = `claim-${randomUUID()}`;
  const claim: Entity = {
    id: claimId,
    kind: "claim",
    title: `${policies[topicOf(policy)].label}: ${policy.value} ${policies[topicOf(policy)].unit}`,
    topic: topicOf(policy),
    value: policy.value,
    scope: artifact.scope,
    quote: originalClaim?.quote?.replace(
      new RegExp(`\\b${originalClaim.value}(?=[- ]${topicOf(policy) === "support_response" ? "hours?" : "days?"}\\b)`, "gi"), String(policy.value),
    ) || review.proposed,
    sourceId: artifact.id,
    status: "current",
    extractionMethod: "reviewed correction",
  };
  state.nodes.push(claim, {
    id: `correction-${randomUUID()}`,
    kind: "correction",
    title: `Updated ${artifact.title}`,
    artifactId: artifact.id,
    decisionId: review.decisionId,
    original: review.original,
    proposed: review.proposed,
    createdAt: new Date().toISOString(),
    status: "applied",
  });
  state.edges.push(
    edge(artifact.id, claimId, "ASSERTS"),
    edge(claimId, policy.id, "DEPENDS_ON"),
  );
  review.status = "applied";
  return review;
}
