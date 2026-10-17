import type { Scope } from "./types.js";

export const policyTopics = ["trial_duration", "refund_window", "cancellation_notice", "support_response"] as const;
export type PolicyTopic = (typeof policyTopics)[number];

export const policies = {
  trial_duration: { label: "Trial duration", unit: "days", root: "topic-trial", initial: 14, suggested: 7, question: "How long is the self-serve trial?", keywords: /\btrial\b/i },
  refund_window: { label: "Refund window", unit: "days", root: "topic-refund", initial: 30, suggested: 14, question: "What is our refund window?", keywords: /\brefunds?\b/i },
  cancellation_notice: { label: "Cancellation notice", unit: "days", root: "topic-cancellation", initial: 30, suggested: 15, question: "How much cancellation notice is required?", keywords: /\bcancel(?:lation|ling|ing|ed)?\b/i },
  support_response: { label: "Support response time", unit: "hours", root: "topic-support", initial: 24, suggested: 12, question: "How quickly does support respond?", keywords: /\bsupport\b|\bresponse\b/i },
} as const;

// Existing trial records predate explicit topic fields.
export function topicOf(record: { topic?: PolicyTopic }): PolicyTopic {
  return record.topic || "trial_duration";
}
export function audience(scope: Scope): string {
  return scope === "new" ? "New self-serve customers" : scope === "enterprise" ? "Enterprise customers" : "All customers";
}
export function policyStatement(topic: PolicyTopic, value: number, scope: Scope): string {
  const who = audience(scope);
  switch (topic) {
    case "trial_duration": return `${who} receive a ${value}-day trial.`;
    case "refund_window": return `${who} have a ${value}-day refund window after purchase.`;
    case "cancellation_notice": return `${who} must give ${value} days of cancellation notice before renewal.`;
    case "support_response": return `${who} receive an initial support response within ${value} hours.`;
  }
}
export function matchingTopics(text: string): PolicyTopic[] {
  return policyTopics.filter((topic) => policies[topic].keywords.test(text));
}
export function validClaimQuote(claim: { topic?: PolicyTopic; value: number; quote: string; scope: Scope }, content: string): boolean {
  const topic = topicOf(claim);
  const unit = topic === "support_response" ? "hours?" : "days?";
  const topics = matchingTopics(claim.quote);
  const quotedScope = /enterprise/i.test(claim.quote) ? "enterprise"
    : /self[- ]serve|new customers|new accounts/i.test(claim.quote) ? "new"
    : /all customers/i.test(claim.quote) ? "all" : undefined;
  return content.includes(claim.quote) && topics.length === 1 && topics[0] === topic && quotedScope === claim.scope
    && Number.isInteger(claim.value) && claim.value >= 1 && claim.value <= 365
    && new RegExp(`\\b${claim.value}[- ]${unit}\\b`, "i").test(claim.quote)
    && !/\bnot\b|\bunless\b|\bexcept\b|\bif\b|\bno longer\b|\bused to\b/i.test(claim.quote);
}
