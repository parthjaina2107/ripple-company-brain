# Repeatable three-minute walkthrough

This is a rehearsal script, not a recorded video. The [hosted Acme demo](https://ripple-company-brain.vercel.app) uses live FalkorDB Cloud and structured question routing. Click **Try your own sandbox** for an isolated, writable graph and follow [JUDGE_SANDBOX.md](JUDGE_SANDBOX.md). Confirm Vercel access before sharing it with judges. To show Gemini as well, use the signed-in local workflow with a configured live model. Video recording is still outstanding.

For a quick shared tour: open Overview, switch graph policy areas, inspect sources in Knowledge library, ask the trial question for self-serve and enterprise customers, compare historical dates, then inspect Review queue and download an existing applied correction. Ask `How long does a refund take to process?` to demonstrate the unsupported-knowledge boundary. Open your own sandbox to perform the writable before/after flow without changing this tour.

## Preparation (outside the three minutes)

1. Follow [LOCAL_SETUP.md](LOCAL_SETUP.md). Run `npm run check:db` and `npm run check:live`. Verify **FalkorDB connected** in the running app.
2. Create a separate rehearsal company under your account; use `https://example.com` as a visibly synthetic example domain. Do not research that domain and claim it contains company policies.
3. In Change studio, record an approved **refund window of 30 days**, audience **New self-serve**, effective **2026-10-16**, analyze as of **2026-10-17**, title `Set refund window to 30 days`. No source impacts is expected in an empty workspace.
4. In Knowledge library add `Synthetic customer refund guide`: `New self-serve customers have a 30-day refund window after purchase. Contact billing support to start a refund request.` Extract, inspect the exact refund claim and audience, select the company policy owner, then save. This is explicitly synthetic data.
5. Add `Synthetic enterprise refund terms`: `Enterprise customers have a 45-day refund window after purchase. Their signed agreement determines the approval process.` Review and save the enterprise claim. It demonstrates an audience exception; this step does not approve an enterprise policy.
6. Ask the refund question for New self-serve on **2026-10-17**. Expect **30 days**. Prepare a proposed 14-day change without submitting it. Keep the original source and trace easy to find.

An alternate real-data walkthrough can use owner-approved public website findings; values and source counts will differ. Never silently mix that story with the synthetic scenario.

## Walkthrough

**0:00–0:20 — Problem and current knowledge.** “A policy changes once, but its old copies remain in company guides and saved agent replies. Which ones become wrong?” Show the company name and FalkorDB status. Ask `What is our refund window?` with New self-serve selected. Show **30 days** and the policy source.

**0:20–0:50 — Make a decision.** In Change studio record `Set refund window to 14 days`, approved, New self-serve, effective and analyze dates **2026-10-17**. The customer guide should be a confirmed conflict. The enterprise source stays unaffected because its audience differs. Counts depend on other sources in this company.

**0:50–1:15 — Show why.** Open the guide's evidence path: `document → ASSERTS → claim → DEPENDS_ON → previous policy/topic`. Explain that FalkorDB discovers the dependency, while approval, date and audience rules establish applicability. A graph edge alone does not prove that text is wrong. Acme's dependent workflows demonstrate the separate owner-review category; reserve them for a longer demonstration.

**1:15–1:55 — Complete work.** Open Review queue, inspect the 30-to-14-day before/after text, and approve the correction. Show revision 2 and preserved history. Select Applied in the review filter and download **Export correction (.md)** or **Download JSON**. The packet contains source details, the decision, evidence, approved text and a checksum for handoff. It does not publish to the external website.

**1:55–2:25 — Recall.** Ask the same question with the same audience/date: **14 days**. Refresh the browser, inspect the company name, and ask again: **14 days** from persisted policy context. Explain the timing accurately: recording the approved policy changes the authoritative answer; applying the correction repairs the stale source. A correction does not create the policy change.

**2:25–2:45 — Boundaries.** Ask `What is our pricing policy?` and show missing knowledge. Mention four supported numeric policy types, explicit approval and separate company graphs. Show the enterprise exception if time permits.

**2:45–3:00 — Finish.** “Ripple turns a policy decision into traceable maintenance work. FalkorDB stores dependencies, policy versions, source snapshots, reviews and correction history. The model extracts and routes; the owner approves.” Show the repository and setup guide.

Rehearse again in another empty company. Do not reset or delete another workspace. Reusing a populated graph changes the history and counts; avoid promising hardcoded counts on arbitrary company data.
