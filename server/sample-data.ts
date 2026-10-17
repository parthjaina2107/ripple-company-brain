import type { Entity, GraphState, Relation } from "../shared/types.js";
import { decisionIntent, policies, topicOf, withDecisionValue, type PolicyTopic } from "../shared/policies.js";

interface SourceProfile {
  id: string; title: string; topic: PolicyTopic; ownerId: string; sourceSystem: string;
  before?: string; after: string;
}
const profiles: SourceProfile[] = [
  { id: "doc-onboarding", title: "Workspace launch · first-project checklist", topic: "trial_duration", ownerId: "owner-product", sourceSystem: "Help center", before: "Start here: create a workspace, import a sample dataset, and invite one teammate.", after: "Use the evaluation period to complete a first project before choosing a paid plan." },
  { id: "doc-support", title: "Evaluation desk · trial eligibility answers", topic: "trial_duration", ownerId: "owner-support", sourceSystem: "Support handbook", before: "For agents handling questions about a new account's evaluation period:", after: "Verify the workspace creation date before explaining when evaluation access ends." },
  { id: "doc-faq", title: "Pricing page · evaluation FAQ", topic: "trial_duration", ownerId: "owner-growth", sourceSystem: "Website CMS", before: "Question: How much time do I have to evaluate Acme?", after: "Customers can explore dashboards and invite collaborators before upgrading." },
  { id: "doc-email", title: "Lifecycle email · welcome to your workspace", topic: "trial_duration", ownerId: "owner-growth", sourceSystem: "Email campaign", before: "Subject: Your first project starts here. Welcome aboard!", after: "Open the starter workspace and follow the three setup tasks in your dashboard." },
  { id: "memory-answer", title: "Onboarding assistant · evaluation-length reply", topic: "trial_duration", ownerId: "owner-support", sourceSystem: "Agent memory", before: "Saved intent: onboarding.trial_length. Reusable response:", after: "Use only for self-serve onboarding questions; route negotiated contracts to Enterprise sales." },
  { id: "doc-enterprise", title: "Enterprise order form · evaluation schedule", topic: "trial_duration", ownerId: "owner-sales", sourceSystem: "Contract workspace", before: "Schedule A defines the evaluation access negotiated with the account team.", after: "Account-specific terms require a signed amendment before access dates change." },
  { id: "doc-enterprise-faq", title: "Solutions engineering · pilot kickoff notes", topic: "trial_duration", ownerId: "owner-sales", sourceSystem: "CRM playbook", before: "Use this note when planning a technical pilot with a procurement-led customer.", after: "Assign a solutions engineer and agree on measurable success criteria at kickoff." },
  { id: "flow-reminder", title: "Lifecycle automation · evaluation reminders", topic: "trial_duration", ownerId: "owner-growth", sourceSystem: "Campaign automation", after: "Read the evaluation window from the workspace launch checklist. Schedule setup nudges and an end-of-evaluation reminder relative to the access end date. Review scheduled offsets when the window changes." },
  { id: "flow-escalation", title: "Care routing · evaluation extension requests", topic: "trial_duration", ownerId: "owner-support", sourceSystem: "Support workflow", after: "Consult the evaluation eligibility handbook, capture the customer's reason for needing more time, and route exceptions to Product. A policy change requires a human to review the routing conditions." },
  { id: "flow-handoff", title: "Revenue handoff · evaluation-to-paid transfer", topic: "trial_duration", ownerId: "owner-sales", sourceSystem: "CRM automation", after: "Attach the evaluation FAQ and workspace activity summary when transferring an upgrade conversation to an account executive. Check handoff timing after changes to the evaluation period." },
  { id: "doc-refund_window-new", title: "Billing help center · purchase refund eligibility", topic: "refund_window", ownerId: "owner-billing", sourceSystem: "Help center", before: "Use the original purchase date to establish the request deadline.", after: "Collect the invoice ID and workspace ID before sending an eligible request to Billing operations. This window describes eligibility, not how long a bank takes to settle a reversal." },
  { id: "doc-refund_window-enterprise", title: "Commercial schedule B · enterprise reimbursement", topic: "refund_window", ownerId: "owner-sales", sourceSystem: "Contract workspace", before: "Negotiated reimbursement terms are maintained with the enterprise order form.", after: "The account executive and Finance must check the signed commercial schedule before authorizing a credit." },
  { id: "memory-refund_window", title: "Billing assistant · purchase-protection reply", topic: "refund_window", ownerId: "owner-billing", sourceSystem: "Agent memory", before: "Saved intent: billing.refund_deadline. Response to a customer asking when to submit a request:", after: "Ask for the invoice reference next. Never promise a settlement date or approve a payment from this saved answer." },
  { id: "flow-refund_window", title: "Billing triage · refund request intake", topic: "refund_window", ownerId: "owner-billing", sourceSystem: "Case workflow", after: "Validate the invoice and purchase timestamp against the billing help article. Flag requests outside the published window for Finance review. Keep eligibility checks separate from payment execution." },
  { id: "doc-cancellation_notice-new", title: "Account settings · stopping the next renewal", topic: "cancellation_notice", ownerId: "owner-success", sourceSystem: "Product documentation", before: "Customers manage renewal settings from Workspace → Billing → Subscription.", after: "Show the renewal date before accepting a non-renewal request. Keep workspace access available through the paid subscription period." },
  { id: "doc-cancellation_notice-enterprise", title: "Procurement addendum · non-renewal requirements", topic: "cancellation_notice", ownerId: "owner-sales", sourceSystem: "Contract workspace", before: "This addendum governs notice requirements for negotiated subscriptions.", after: "Send formal notice through the contact channel named in the signed agreement and retain the delivery record." },
  { id: "memory-cancellation_notice", title: "Renewal assistant · notice-deadline explanation", topic: "cancellation_notice", ownerId: "owner-success", sourceSystem: "Agent memory", before: "Saved intent: subscription.non_renewal_notice. Suggested explanation:", after: "Ask for the renewal date to help the customer identify the relevant deadline. Do not treat account deletion as a cancellation request." },
  { id: "flow-cancellation_notice", title: "Customer success · non-renewal checklist", topic: "cancellation_notice", ownerId: "owner-success", sourceSystem: "Success playbook", after: "Use the account-settings guide to validate the notice deadline. Confirm the final access date, assign a retention owner, and send an acknowledgement. A human must review the checklist when notice requirements change." },
  { id: "doc-support_response-new", title: "Help desk · first-response commitment", topic: "support_response", ownerId: "owner-support", sourceSystem: "Service handbook", before: "A first response acknowledges the request and establishes the next step; it is not a resolution guarantee.", after: "Attach the workspace ID, error details, and impact description so the assigned specialist can investigate." },
  { id: "doc-support_response-enterprise", title: "Priority care · enterprise service schedule", topic: "support_response", ownerId: "owner-support", sourceSystem: "Service agreement", before: "Priority-care contacts use the dedicated escalation channel listed on their account.", after: "The incident coordinator owns the initial acknowledgement and the next communication checkpoint." },
  { id: "memory-support_response", title: "Support concierge · first-contact promise", topic: "support_response", ownerId: "owner-support", sourceSystem: "Agent memory", before: "Saved intent: care.initial_response. Reusable customer-facing acknowledgement:", after: "Do not substitute this commitment for a fix estimate. Escalate critical incidents using the service handbook." },
  { id: "flow-support_response", title: "Service operations · queue ageing escalation", topic: "support_response", ownerId: "owner-operations", sourceSystem: "Queue automation", after: "Read the first-response commitment from the service handbook. Track unanswered tickets and alert the on-call queue owner before they exceed the commitment. Review alert thresholds when the policy changes." },
];

export function refreshSampleData(state: GraphState, fresh = false): boolean {
  const marker = state.nodes.find((n) => n.id === "topic-trial");
  if (!marker || marker.sampleVersion === 2) return false;
  const add = (node: Entity) => { if (!state.nodes.some((n) => n.id === node.id)) state.nodes.push(node); };
  const connect = (source: string, target: string, type: Relation) => {
    const id = `${source}:${type}:${target}`;
    if (!state.edges.some((e) => e.id === id)) state.edges.push({ id, source, target, type, active: true });
  };
  add({ id: "owner-billing", kind: "owner", title: "Billing operations" });
  add({ id: "owner-success", kind: "owner", title: "Customer success" });
  add({ id: "owner-operations", kind: "owner", title: "Service operations" });
  for (const profile of profiles) {
    const source = state.nodes.find((n) => n.id === profile.id);
    if (!source) continue;
    // Only refresh untouched sample text. User corrections and imported sources retain their content.
    if ((source.revision || 1) !== 1) continue;
    const claim = state.nodes.find((n) => n.kind === "claim" && n.sourceId === source.id && n.status === "current");
    const content = [profile.before, claim?.quote, profile.after].filter(Boolean).join("\n\n");
    if (!fresh) source.original = source.content;
    source.content = content;
    source.title = profile.title;
    source.topic = profile.topic;
    source.sourceSystem = profile.sourceSystem;
    source.ownerId = profile.ownerId;
    source.revision = fresh ? 1 : 2;
    for (const e of state.edges.filter((e) => e.source === source.id && e.type === "OWNED_BY" && e.target !== profile.ownerId)) e.active = false;
    connect(source.id, profile.ownerId, "OWNED_BY");
  }
  const extras: Array<{ id: string; title: string; topic: PolicyTopic; kind: "document" | "workflow"; ownerId: string; system: string; content: string; value?: number; quote?: string; dependency: string }> = [
    { id: "doc-refund-receipt", title: "Invoice email · purchase-protection footer", topic: "refund_window", kind: "document", ownerId: "owner-billing", system: "Transactional email", content: "Keep this receipt for your records. New self-serve customers have a 30-day refund window after purchase. Reply with your invoice reference to start a billing enquiry.", value: 30, quote: "New self-serve customers have a 30-day refund window after purchase.", dependency: "topic-refund" },
    { id: "flow-refund-finance", title: "Finance controls · refund authorisation handoff", topic: "refund_window", kind: "workflow", ownerId: "owner-billing", system: "Finance playbook", content: "Take eligible cases from Billing triage, verify the invoice amount and payment reference, and obtain a Finance approver. The help-center eligibility window determines which cases enter this handoff; no payment is executed by Ripple.", dependency: "flow-refund_window" },
    { id: "flow-renewal-calendar", title: "Renewal calendar · notice deadline reminders", topic: "cancellation_notice", kind: "workflow", ownerId: "owner-success", system: "Calendar automation", content: "Calculate the non-renewal reminder date from the account-settings notice requirement and the contract renewal date. Assign the account owner and reschedule outstanding reminders after a notice-period change.", dependency: "doc-cancellation_notice-new" },
    { id: "doc-support-widget", title: "Help widget · ticket acknowledgement copy", topic: "support_response", kind: "document", ownerId: "owner-product", system: "Application UI", content: "Your request is in our queue. New self-serve customers receive an initial support response within 24 hours. Include a reproducible example while you wait; urgent account incidents follow the escalation channel.", value: 24, quote: "New self-serve customers receive an initial support response within 24 hours.", dependency: "topic-support" },
  ];
  for (const item of extras) {
    if (state.nodes.some((n) => n.id === item.id)) continue;
    add({ id: item.id, kind: item.kind, topic: item.topic, title: item.title, content: item.content, sourceSystem: item.system, ownerId: item.ownerId, scope: "new", status: "current", revision: 1, createdAt: "2026-10-12T09:00:00Z" });
    connect(item.id, item.ownerId, "OWNED_BY");
    if (item.value !== undefined) {
      const claimId = `${item.id}-claim`;
      add({ id: claimId, kind: "claim", topic: item.topic, title: `${policies[item.topic].label}: ${item.value} ${policies[item.topic].unit}`, quote: item.quote, value: item.value, scope: "new", sourceId: item.id, status: "current", extractionMethod: "reviewed seed" });
      connect(item.id, claimId, "ASSERTS"); connect(claimId, item.dependency, "DEPENDS_ON");
    } else connect(item.id, item.dependency, "DEPENDS_ON");
  }
  // Repair the old title-only routing bug without changing what the user originally entered.
  for (const decision of state.nodes.filter((n) => n.kind === "decision")) {
    const policy = state.nodes.find((n) => n.id === decision.policyId);
    if (!policy) continue;
    const intent = decisionIntent(decision.title);
    if (intent.topics.length === 1 && intent.topics[0] !== topicOf(policy)) {
      const reason = `Invalidated: this title requested ${policies[intent.topics[0]].label.toLowerCase()}, but an earlier form saved it as ${policies[topicOf(policy)].label.toLowerCase()}. Record a new decision in the intended area.`;
      decision.status = policy.status = "invalid";
      decision.reason = policy.reason = reason;
    } else if (intent.value !== undefined && intent.value !== policy.value) {
      decision.originalTitle = policy.originalTitle = decision.title;
      decision.title = policy.title = withDecisionValue(decision.title, String(policy.value));
    }
  }
  marker.sampleVersion = 2;
  return true;
}
