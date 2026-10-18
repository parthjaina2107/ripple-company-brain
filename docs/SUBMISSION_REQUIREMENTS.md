# Submission requirements map

Checked October 18, 2026 against the [official Graph Hacks rules](https://www.wemakedevs.org/hackathons/falkordb/rules). This maps repository evidence to requirements; it is not confirmation of registration or event-portal submission.

| Requirement | Repository evidence / status |
|---|---|
| Public source repository | [Ripple on GitHub](https://github.com/parthjaina2107/ripple-company-brain) |
| README with setup instructions | [README](../README.md), [complete local setup](LOCAL_SETUP.md), [environment template](../.env.example) |
| Graph data model | Model and Mermaid diagram directly in the README; [detailed model](GRAPH_MODEL.md) |
| Cypher queries or graph algorithms the product depends on | Actual dependency traversal directly in the README; [query explanations](QUERIES.md), [executable repository](../server/repository.ts) |
| FalkorDB as primary database, central to the solution | Native dependency traversal, versioned policies, decisions, corrections and persistent recall; [verification](VERIFICATION.md). SQLite is limited to local authentication records. Preview mode is not the submission runtime. |
| Declared track | **Track 03 — Company Brain**, consistent across README and [submission description](SUBMISSION.md) |
| Working demo video | Not linked in this repository. Supply the required video through the event submission process. |
| Live deployment or complete local setup | [Public deployment](https://ripple-company-brain.vercel.app), [interactive judge sandbox](JUDGE_SANDBOX.md), [local setup](LOCAL_SETUP.md) |
| Permitted data | Synthetic Acme fixtures in [seed](../server/seed.ts), [sample data](../server/sample-data.ts) and [public policy fixture](../public/acme-policies.html). User research is limited to permitted public sources; no private company data is included. |
| AI assistance disclosure | Concise disclosure in README and [submission description](SUBMISSION.md). |
| Participant understanding and meaningful contribution | Team must confirm its own contribution history and explain the model, query, policy authority and idempotency. [Judge Q&A](JUDGE_QA.md) and [presentation notes](PRESENTATION.md) support rehearsal; documentation does not substitute for understanding. |
| Registration, creation-window eligibility and final entry | Owner must confirm these in the event portal; repository preparation does not establish them. Official deadline: October 18, 2026, 11:59 PM IST. |

The [submission handoff](SUBMISSION_CHECKLIST.md) records verification and remaining owner actions. Blog material is a [local draft](BLOG_POST.md); it is not represented as published.
