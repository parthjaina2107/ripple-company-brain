import type { Scope } from "./types.js";

export const policyTopics = ["trial_duration", "refund_window", "cancellation_notice", "support_response"] as const;
export type PolicyTopic = (typeof policyTopics)[number];

export const policies = {
  trial_duration: { label: "Trial duration", unit: "days", root: "topic-trial", initial: 14, suggested: 7, question: "How long is the self-serve trial?", keywords: /\btrial\b|\bfree trail\b/i },
  refund_window: { label: "Refund / return window", unit: "days", root: "topic-refund", initial: 30, suggested: 14, question: "What is our refund window?", keywords: /\brefunds?\b|\breturns?\s+(?:policy|window|period)\b/i },
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

export function decisionIntent(title: string) {
  const topics = matchingTopics(title);
  const quantities = [...title.matchAll(/\b(\d{1,3})[- ](days?|hours?)\b/gi)];
  const quantity = quantities.length === 1 ? quantities[0] : undefined;
  return { topics, value: quantity ? Number(quantity[1]) : undefined,
    unit: quantity ? (quantity[2].toLowerCase().startsWith("hour") ? "hours" : "days") : undefined };
}

export function decisionIssue(input: { topic?: PolicyTopic; title: string; value: number }): string | undefined {
  const intent = decisionIntent(input.title);
  const topic = topicOf(input);
  if (intent.topics.length > 1) return "Choose one policy area per decision. Split this title into separate changes.";
  if (intent.topics.length === 1 && intent.topics[0] !== topic)
    return `The title describes ${policies[intent.topics[0]].label.toLowerCase()}, but the selected area is ${policies[topic].label.toLowerCase()}. Select the matching policy area before saving.`;
  if (intent.unit && intent.unit !== policies[topic].unit)
    return `${policies[topic].label} uses ${policies[topic].unit}. Make the title and value use the same unit.`;
  if (intent.value !== undefined && intent.value !== input.value)
    return `The title says ${intent.value} ${intent.unit}, but the value is ${input.value} ${policies[topic].unit}. Make them match before saving.`;
}

export function withDecisionValue(title: string, value: string): string {
  return /^\d+$/.test(value) ? title.replace(/\b\d{1,3}(?=[- ](?:days?|hours?)\b)/gi, value) : title;
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
