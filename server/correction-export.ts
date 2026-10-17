import { createHash } from "node:crypto";
import type { CompanyProfile, CorrectionExport, GraphState } from "../shared/types.js";
import { DomainError } from "./domain.js";
import { policies, topicOf } from "../shared/policies.js";

export function correctionExport(state: GraphState, reviewId: string, company: CompanyProfile): CorrectionExport {
  const review = state.nodes.find((node) => node.kind === "review" && node.id === reviewId);
  if (!review) throw new DomainError("Review not found in this company workspace.", 404);
  if (review.status !== "applied" || review.classification !== "conflict" || !review.proposed)
    throw new DomainError("Only an approved and applied text correction can be exported.");
  const artifact = state.nodes.find((node) => node.id === review.artifactId);
  const policy = state.nodes.find((node) => node.id === review.policyId);
  const decision = state.nodes.find((node) => node.id === review.decisionId);
  const correction = state.nodes.find((node) => node.kind === "correction" && node.artifactId === review.artifactId && node.decisionId === review.decisionId && node.original === review.original && node.proposed === review.proposed);
  if (!artifact || !policy || !decision || !correction) throw new DomainError("The correction's audit evidence is incomplete.");
  const contentSha256 = createHash("sha256").update(review.proposed).digest("hex");
  const packet = {
    schemaVersion: 1 as const,
    company: { id: company.id, name: company.name },
    reviewId: review.id, correctionId: correction.id, approvedAt: correction.createdAt || null,
    actor: correction.actor || "Legacy record: actor unavailable", approvalReason: correction.approvalReason,
    source: { id: artifact.id, title: artifact.title, url: artifact.sourceUrl || null, revisionBefore: review.sourceRevision || 1, revisionAfter: (review.sourceRevision || 1) + 1 },
    policy: { id: policy.id, area: policies[topicOf(policy)].label, value: policy.value!, unit: policies[topicOf(policy)].unit, audience: policy.scope!, effectiveFrom: policy.effectiveFrom! },
    decision: { id: decision.id, title: decision.title },
    evidence: (review.path || []).map((id, index, path) => ({ id, title: state.nodes.find((node) => node.id === id)?.title || id,
      relationshipToNext: index < path.length - 1 ? state.edges.find((edge) => edge.source === id && edge.target === path[index + 1])?.type || null : null })),
    original: review.original || "", corrected: review.proposed, contentSha256,
    externalPublication: false as const,
    instructions: "Apply the corrected text in the external source after checking its current revision. This export does not publish changes or prove the external source was updated. The SHA-256 digest checks content equality; it is not a signature.",
  };
  // Indent untrusted source text so Markdown in a document cannot become packet metadata.
  const literal = (value: string) => value.split("\n").map((line) => `    ${line}`).join("\n");
  const markdown = ["# Ripple — approved correction", "", "Company:", "", literal(company.name), "", `Review: ${packet.reviewId}`, `Approved in Ripple: ${packet.approvedAt}`, "", "## Source", "", literal(`${artifact.title}\n${artifact.sourceUrl || "No external URL stored"}\nRevision ${packet.source.revisionBefore} → ${packet.source.revisionAfter}`), "", "## Approved policy", "", literal(`${packet.policy.area}: ${policy.value} ${packet.policy.unit}\nAudience: ${policy.scope}\nEffective from: ${policy.effectiveFrom}\nDecision: ${decision.title}`), "", "## Evidence path", "", literal(packet.evidence.map((node) => `${node.title} [${node.id}]${node.relationshipToNext ? ` —${node.relationshipToNext}→` : ""}`).join("\n")), "", "## Original text", "", literal(packet.original), "", "## Corrected text", "", literal(packet.corrected), "", "## Handoff", "", packet.instructions, "", `Corrected text SHA-256: ${contentSha256}`, ""].join("\n");
  return { fileBase: `ripple-correction-${correction.id.replace(/[^a-zA-Z0-9_-]/g, "")}`, markdown, packet };
}
