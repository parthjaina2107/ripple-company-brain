# Try Ripple yourself

Open [Ripple](https://ripple-company-brain.vercel.app), then **Try your own sandbox**. No account is needed. The shared Acme tour stays read-only; each visitor gets an isolated writable FalkorDB graph and a signed HttpOnly session. Use synthetic data only.

## Five-minute walkthrough

1. Use **1 · Ask the baseline**. Ask `What is our refund window?` with New self-serve and 17 October 2026. A fresh sandbox returns **30 days**, with approved graph evidence. The screen identifies live model routing.
2. Use **2 · Record a change**. The guide fills Refund / return window, 14 days, Approved, New self-serve, and the demo date. Click **Record & analyze change**.
3. Inspect the graph paths. Direct contradictory claims become Confirmed conflict; dependent workflows require owner review; enterprise records are preserved.
4. Use **3 · Inspect & correct**. Open a pending confirmed refund conflict, compare the before/after text, and apply it. The original and correction history remain.
5. Use **4 · Publish to Acme**. Click **Publish approved copy**. The controlled customer help centre displays the corrected source and a publication receipt. This surface belongs to your sandbox; it does not edit an unrelated company website.
6. Use **5 · Ask again**: **14 days**. Refresh and repeat to demonstrate persistence. Enterprise still returns **60 days**; 1 October returns **30 days**. The policy decision changes authoritative answers; applying and publishing repair downstream copies.
7. In Review queue, choose Applied and download Markdown or JSON. Check source revisions, decision, evidence, actor and SHA-256 checksum. The checksum is content integrity, not a digital signature.
8. Try `Can trial users export data?`, `Can support reset my password?`, and `How long does a refund take to process?`. These abstain from unsupported policy claims.

## Research and ingestion

In **Policy research**, the prefilled URL is a [public fictional Acme policy page](https://ripple-company-brain.vercel.app/acme-policies.html). Research it, inspect exact quotes, explicitly select audiences and approve findings. Importing a changed value generates affected-source reviews. Researching an unchanged value does not duplicate the same source. The fixed public fixture and your sandbox's publishing surface have distinct purposes.

In **Knowledge library**, add a document, extract its claims, review and save. Example: `New self-serve customers have a 30-day refund window after purchase.` Then record a different approved refund duration to find the new source's contradiction. Ambiguous processing, conditional or unsupported statements are not treated as duration policies.

## Limits and restart

Sessions expire two hours after creation. **Return to shared tour** preserves the sandbox for resumption. **Finish & release sandbox** deletes its disposable data after confirmation and frees its slot; then start a new one. Export corrections before releasing.

FalkorDB atomically admits up to ten active sandbox leases. Every save enforces projected limits of 600 entities, 1,800 relationships and 1.5 MB of serialized graph data. Stale writes return 409 and ask you to refresh. Request keys prevent saved mutations being duplicated after an ambiguous retry. These are bounded hackathon resources, not unlimited enterprise capacity.

Expired graphs are removed on provisioning and by a daily authenticated cleanup job. Two-hour access expiry is separate from physical deletion time. The daily shared AI allowance is 200 provider operations; request budgets also apply. When a limit or provider issue occurs, the UI reports it rather than inventing an answer.

Real company membership/account management is available locally, requiring durable auth storage for hosted production use. Judges can exercise the complete synthetic policy workflow through the public sandbox.

## Verification

`npm run check:judge` tests the actual Vercel adapter over HTTP against Cloud: separate visitors, corrections, actor-aware exports, publishing and isolation. `npm run check:concurrency` tests two independent Cloud writers, stale-save rejection, request deduplication, capacity rejection and backup restoration. Both clean up their own disposable graphs.

`npx tsx scripts/check-deployment.ts https://ripple-company-brain.vercel.app` tests the public deployment, including live Gemini, public research/approval, change/correction/export/publication, audience/date exceptions and unsupported questions. It releases its test sandbox.
