import { useEffect, useState } from "react";
import { Check, ExternalLink, Globe, LoaderCircle, Search, ShieldCheck } from "lucide-react";
import type { CompanyProfile, GraphState, ResearchResult, Scope } from "../shared/types";
import { policies, topicOf } from "../shared/policies";
import { api } from "./api";
import { workspaceDate } from "../shared/dates";

export default function CompanyResearch({ company, graph, onImported }: { company: CompanyProfile; graph: GraphState; onImported: () => Promise<void> }) {
  const [website, setWebsite] = useState(company.sandbox ? "https://ripple-company-brain.vercel.app/acme-policies.html" : company.website);
  const [result, setResult] = useState<ResearchResult>();
  const [history, setHistory] = useState<ResearchResult[]>([]);
  const [selected, setSelected] = useState<Record<string, Scope | "">>({});
  const [effectiveFrom, setEffectiveFrom] = useState(workspaceDate(company));
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [notice, setNotice] = useState("");
  useEffect(() => { let active = true; void api<ResearchResult[]>("/research").then((items) => { if (active) { setHistory(items); setResult(items[0]); } }).catch((err: Error) => { if (active) setError(err.message); }); return () => { active = false; }; }, [company.id]);
  async function research() {
    setBusy(true); setError(""); setNotice(""); setSelected({}); setResult(undefined);
    try { const next = await api<ResearchResult>("/research", { website }, { timeoutMs: 120000 }); setResult(next); setHistory(await api("/research")); }
    catch (err) { setError(err instanceof Error ? err.message : "Research failed."); } finally { setBusy(false); }
  }
  async function approve() {
    if (!result) return;
    const selections = Object.entries(selected).map(([findingId, scope]) => ({ findingId, scope }));
    if (!selections.length || selections.some((item) => !item.scope)) { setError("Select at least one finding and explicitly assign its customer audience."); return; }
    setBusy(true); setError("");
    try {
      const imported = await api<{ documentsCreated: number; policiesCreated: number }>(`/research/${result.id}/approve`, { effectiveFrom, selections });
      await onImported(); setResult({ ...result, approved: true }); setHistory(await api("/research")); setSelected({});
      setNotice(`Saved ${imported.documentsCreated} source documents and ${imported.policiesCreated} approved policy versions. You can now ask questions or record a change in Change studio.`);
    } catch (err) { setError(err instanceof Error ? err.message : "Approval failed."); } finally { setBusy(false); }
  }
  return <div className="research-workspace">
    <section className="card research-intro">
      <span className="eyebrow"><Globe size={15} /> PUBLIC SOURCES · {company.name}</span>
      <h2>Start with your company's own words.</h2>
      <p>Read a public HTTPS page and up to three linked policy pages on the same website. Review the exact quotes before approving a company baseline.</p>
      <form className="research-form" onSubmit={(event) => { event.preventDefault(); void research(); }}>
        <label>Official website or direct policy URL<input type="url" required maxLength={2000} value={website} placeholder="https://your-company.com/policies" onChange={(e) => setWebsite(e.target.value)} disabled={busy} /></label>
        <button className="primary" disabled={busy}>{busy ? <LoaderCircle className="spin" size={17} /> : <Search size={17} />}{busy ? "Researching public sources…" : "Research website"}</button>
      </form>
      <p className="form-help">Currently extracts trial duration, refund/return windows, cancellation notice and initial support response times. Private pages, PDF files and pages requiring JavaScript rendering are not supported. No internal company access is implied.</p>
      {error ? <div role="alert" className="notice">{error}</div> : null}
      {notice ? <div role="status" className="decision-preview">{notice}</div> : null}
    </section>
    {history.length > 1 ? <label className="research-history">Saved research snapshot<select disabled={busy} value={result?.id || ""} onChange={(e) => { setResult(history.find((item) => item.id === e.target.value)); setSelected({}); setError(""); }}><option value="" disabled>Select a snapshot</option>{history.map((item) => <option key={item.id} value={item.id}>{new URL(item.website).hostname} · {new Date(item.createdAt).toLocaleString()} · {item.approved ? "Imported" : "Needs review"}</option>)}</select></label> : null}
    {result ? <>
      <section className="card research-sources"><div className="card-heading"><h2>Sources read</h2><span className="number-bubble">{result.pages.length}</span></div>
        {result.pages.map((page) => <details key={page.url}><summary>{page.title}</summary><a href={page.url} target="_blank" rel="noreferrer">{page.url}<ExternalLink size={13} /></a><small>Retrieved {new Date(page.retrievedAt).toLocaleString()}</small><p className="source-content">{page.text.slice(0, 1400)}{page.text.length > 1400 ? "…" : ""}</p></details>)}
      </section>
      {result.warnings.map((warning, index) => <p className="notice" key={index}>{warning}</p>)}
      <section className="card research-findings"><div className="card-heading"><div><h2>Policy findings to review</h2><p>{result.approved ? "This snapshot has been imported. Research again to check for new public information." : "Research is evidence, not approval. Select a quote only after checking its terms and audience."}</p></div><span className="number-bubble">{result.findings.length}</span></div>
        {result.findings.map((finding) => {
          const existing = graph.nodes.filter((node) => node.kind === "policy" && node.status === "approved" && topicOf(node) === finding.topic && node.effectiveFrom! <= effectiveFrom && (node.scope === (selected[finding.id] || finding.scope) || node.scope === "all"))
            .sort((a, b) => b.effectiveFrom!.localeCompare(a.effectiveFrom!) || (b.createdAt || "").localeCompare(a.createdAt || "") || (b.revision || 0) - (a.revision || 0))[0];
          return <article key={finding.id} className="research-finding">
            <label className="finding-select"><input type="checkbox" disabled={busy || result.approved} checked={finding.id in selected} onChange={(e) => setSelected((previous) => { const next = { ...previous }; if (e.target.checked) next[finding.id] = finding.scope || ""; else delete next[finding.id]; return next; })} /><strong>{policies[finding.topic].label} · {finding.value} {policies[finding.topic].unit}</strong></label>
            <blockquote>{finding.quote}</blockquote>
            <a href={finding.sourceUrl} target="_blank" rel="noreferrer">View source <ExternalLink size={13} /></a>
            {existing ? <p className={existing.value !== finding.value ? "notice" : "muted"}>{existing.value !== finding.value ? `Potential change: the saved approved policy says ${existing.value} ${policies[finding.topic].unit}. Check the source before replacing it.` : "This value agrees with the saved approved policy."}</p> : null}
            {finding.id in selected ? <label>Audience for this approved finding<select required disabled={busy || result.approved} value={selected[finding.id]} onChange={(e) => setSelected({ ...selected, [finding.id]: e.target.value as Scope })}><option value="">Choose the audience after checking the source</option><option value="new">New self-serve customers</option><option value="enterprise">Enterprise customers</option><option value="all">All customers</option></select></label> : null}
          </article>;
        })}
        {!result.findings.length ? <div className="empty"><Globe size={28} /><h3>No supported policy claims found.</h3><p>Use a direct public policy page with explicit numbers and units. Ripple will not invent missing policies.</p></div> : null}
        {!result.approved && result.findings.length ? <form className="research-approval" onSubmit={(event) => { event.preventDefault(); void approve(); }}><label>Approved baseline effective from<input type="date" required disabled={busy} value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} /></label><p className="form-help">This date is your approval choice, not an effective date inferred from the website. Confirm that the selected quotes represent the policy you want to adopt.</p><button className="primary" disabled={busy || !Object.keys(selected).length}>{busy ? <LoaderCircle className="spin" size={16} /> : <ShieldCheck size={16} />}Approve selected findings & connect sources</button></form> : result.approved ? <p className="research-approved"><Check size={17} />Sources connected to this company's graph.</p> : null}
      </section>
    </> : !busy ? <div className="empty"><Globe size={32} /><h3>No imported company policies yet.</h3><p>Start research above. An empty workspace stays empty until you approve findings.</p></div> : null}
  </div>;
}
