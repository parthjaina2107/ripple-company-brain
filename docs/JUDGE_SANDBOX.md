# Try Ripple yourself

Open [Ripple](https://ripple-company-brain.vercel.app) and click **Try your own sandbox** in the banner. No Ripple account is required. Each visitor receives a signed, HTTP-only session cookie and a separate FalkorDB graph containing synthetic Acme policies, sources, workflows and saved replies. The shared tour remains read-only.

## Five-minute walkthrough

1. In **Ask Ripple**, select New self-serve and October 17, 2026. Ask `What is our refund window?` The fresh sandbox returns **30 days**.
2. In **Change studio**, choose Refund / return window. Enter `Set refund window to 14 days`, value **14**, Approved, New self-serve, with effective and analysis dates October 17, 2026. Click **Record & analyze change**.
3. Inspect a confirmed conflict and its graph evidence. Compare it with a workflow marked Needs review and the unaffected enterprise source.
4. Open **Review queue** and apply one refund correction after reviewing the before/after text. Its stored source changes from 30 to 14 days, while history remains available.
5. Filter reviews to Applied and export Markdown or JSON. The export includes the source, decision, evidence and content checksum; it does not publish an external website.
6. Ask the refund question again: **14 days**. Refresh and repeat: **14 days**. Enterprise refund policy remains **60 days**. Approving the decision changes authoritative answers; applying the correction repairs stale source text.
7. Try the other policy areas, add a document and extract its claims, or research a public HTTPS policy page and review its findings before approval. Hosted extraction/routing is structured; no hosted Gemini key is configured.
8. Ask `How long does a refund take to process?` It should return no applicable policy because eligibility and payment-processing time differ.

## Isolation and limits

Return to the shared tour using the banner or workspace switcher. Opening your sandbox again in the same browser resumes its graph. A separate browser session receives a separate graph. Treat sandboxes as disposable: do not enter private company information.

Sessions expire two hours after creation. Expired sandbox graphs in the dedicated namespace are removed when a new session is provisioned; unrelated graphs are never included in that cleanup. Provisioning checks for ten active sandboxes, and each sandbox has a 400-node admission limit for new decisions/documents/research. These are prototype resource controls, not a distributed quota or concurrency guarantee. Concurrent writes across serverless instances are not covered by the per-instance operation queue.

Writable real-company accounts still require the local workflow and persistent authentication storage. Sandbox sessions do not grant access to those accounts or the shared tour's write routes.

## Verification

`npm run check:judge` exercises the actual Vercel handler over local HTTP against Cloud with two signed cookie jars: change, native graph impact, correction, idempotent retry, export, recall, session resume, origin rejection, missing/forged-cookie rejection and visitor isolation. It deletes only the temporary sandbox graphs created by that verification run. It is an HTTP verification, not an automated browser recording.

To enable hosted sandboxes, configure `RIPPLE_SANDBOX_SECRET` as a random server-side secret of at least 32 characters, alongside the existing Cloud connection settings. Never expose it through a `VITE_*` variable.
