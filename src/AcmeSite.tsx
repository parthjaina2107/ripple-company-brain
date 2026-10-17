import { useState } from "react";
import type { GraphState } from "../shared/types";
import { api } from "./api";
export default function AcmeSite({ graph, refresh }: { graph: GraphState; refresh: () => Promise<void> }) {
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState("");
  const published = graph.nodes.filter((n) => n.kind === "publication" && n.status === "published");
  const ready = graph.nodes.filter((n) => n.kind === "review" && n.status === "applied" && n.classification === "conflict" && !graph.nodes.some((p) => p.id === `publication-${n.id}`));
  return <section className="card judge-guide">
    <span className="eyebrow">CONTROLLED COMPANY SITE · FICTIONAL ACME</span>
    <h2>Acme customer help centre</h2>
    <p>This is your sandbox's customer-facing publishing surface. Applying a correction changes the internal source; publishing below makes the approved copy visible here. Each publication keeps its source revision, decision, time and actor.</p>
    <p>It does not edit an unrelated company's website. The public research fixture stays unchanged.</p>
    {message ? <p role="status" className="notice">{message}</p> : null}
    {ready.map((review) => <div className="publication-action" key={review.id}><span>{review.title}</span><button className="primary" disabled={busy} onClick={async () => { setBusy(true); setMessage(""); try { await api(`/reviews/${encodeURIComponent(review.id)}/publish`, {}); await refresh(); setMessage("Published. The customer copy below now reflects the approved correction."); } catch (error) { setMessage(error instanceof Error ? error.message : "Publication failed."); } finally { setBusy(false); } }}>Publish approved copy</button></div>)}
    {!published.length ? <p className="notice">No corrections published yet. Record a policy change, apply a confirmed correction in Review queue, then return here.</p> : published.map((item) => <article className="published-copy" key={item.id}><h3>{item.title}</h3><p>{item.content}</p><small>Source revision {item.sourceRevision} · Published {new Date(item.createdAt!).toLocaleString()} · {item.actor}</small></article>)}
  </section>;
}
