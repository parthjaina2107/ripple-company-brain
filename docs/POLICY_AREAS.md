# Company policy areas

All values below are fictional Acme sample policies effective October 1, 2026. They are not FalkorDB, hackathon, or real company rules. Your recorded decisions may supersede them.

| Policy area | Self-serve baseline | Enterprise baseline | Example question |
|---|---|---|---|
| Trial duration | 14 days | 14 days | How long is the trial? |
| Refund window after purchase | 30 days | 60 days | What is our refund window? |
| Cancellation notice before renewal | 30 days | 60 days | How much cancellation notice is required? |
| Initial support response | 24 hours | 4 hours | How quickly does support respond? |

## Try a new area

1. Open **Knowledge library**. Search for “refund” to see the guide, saved agent answer, and handling workflow. Open a source to read its text.
2. Open **Overview** and select **Refund window** under **Graph policy area**. Inspect its separate dependency neighborhood.
3. Open **Ask Ripple**, choose **New self-serve**, and ask “What is our refund window?” using October 16, 2026. An unchanged baseline returns 30 days with its policy reference. Select Enterprise for its 60-day exception.
4. Open **Change studio**, choose **Refund window** under **Policy area**, and enter 14 days. Keep the title consistent. Choose Approved, New self-serve customers, and an effective date no later than the analysis date.
5. Record and analyze. On fresh sample data, expect two conflicting claims (guide and saved answer), one workflow review, and an unaffected enterprise guide. Existing user edits can change these counts.
6. Inspect the full evidence path, review one proposed correction, and apply it. The original claim stays in history. The workflow requires a human review; Ripple does not execute it.
7. Ask the refund question again. The approved policy now returns 14 days. Trial duration and other policy areas retain their own values.

Repeat with **Cancellation notice** (days) or **Support response time** (hours). Proposed and future changes do not override current policies.

## Add a document with multiple topics

In **Knowledge library → Add document**, paste explicit sentences such as:

> New self-serve customers have a 30-day refund window after purchase. New self-serve customers receive an initial support response within 24 hours.

Extract policy claims, inspect each topic, number, unit, audience, and source quote, then save. Refresh a saved decision analysis from the decision log to include the new document. Corrections for refunds preserve the support statement and its assertion link. A sentence mixing topics, an ambiguous audience, an unsupported unit, or a conditional promise is not suitable for automatic claim extraction.

## Data upgrade

Startup adds missing sample policy areas once. It keeps all existing trial decisions, corrections, documents and review history. It does not reset or overwrite the workspace. Legacy records without a topic retain their trial-duration meaning.

## Boundaries

These are duration policies, not a general business-rule engine. Refund processing time and payment method, cancellation fees, pricing, support opening hours, and resolution guarantees are unsupported. Questions about them should return no applicable policy rather than borrow a number from a different policy. Changes apply only to knowledge inside Ripple; there are no external document or business-system write integrations.
