import { useEffect, useState } from "react";
import {
  Activity,
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clock3,
  Database,
  Download,
  FileText,
  GitBranch,
  Globe,
  History,
  LayoutDashboard,
  LoaderCircle,
  MessageSquare,
  Network,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Upload,
  Waves,
  X,
} from "lucide-react";
import type {
  Analysis,
  Answer,
  Entity,
  Extraction,
  Impact,
  Scope,
  Workspace,
  CompanyProfile,
  CorrectionExport,
} from "../shared/types";
import { api } from "./api";
import KnowledgeMap from "./KnowledgeMap";
import CompanyResearch from "./CompanyResearch";
import { workspaceDate } from "../shared/dates";
import AcmeSite from "./AcmeSite";
import { policies, policyTopics, topicOf, decisionIntent, decisionIssue, withDecisionValue, policyStatement, type PolicyTopic } from "../shared/policies";

type Page =
  | "Overview"
  | "Acme website"
  | "Policy research"
  | "Change studio"
  | "Knowledge library"
  | "Review queue"
  | "Decision log"
  | "Ask Ripple";
const navigation = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "Policy research", icon: Search },
  { label: "Change studio", icon: GitBranch },
  { label: "Knowledge library", icon: BookOpen },
  { label: "Review queue", icon: CheckCheck },
  { label: "Decision log", icon: History },
  { label: "Ask Ripple", icon: MessageSquare },
  { label: "Acme website", icon: Globe },
] as const;
const scopeLabel = (s?: Scope) =>
  s === "new"
    ? "New self-serve customers"
    : s === "enterprise"
      ? "Enterprise customers"
      : "All customers";
const dateLabel = (s?: string) =>
  s
    ? new Intl.DateTimeFormat("en", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(s.length === 10 ? `${s}T00:00:00Z` : s))
    : "—";
const statusLabel = (s?: string) =>
  s === "conflict"
    ? "Confirmed conflict"
    : s === "review"
      ? "Needs review"
      : s === "unaffected"
        ? "Unaffected"
        : s || "Current";
const hostedShareDemo = import.meta.env.VITE_SHARE_DEMO === "true";
function Badge({ value }: { value?: string }) {
  return (
    <span className={`badge ${value || ""}`}>
      <i />
      {statusLabel(value)}
    </span>
  );
}
function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="empty">
      <Waves size={32} />
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

export default function App({ company, onAccount, onSignOut }: { company: CompanyProfile; onAccount: () => void; onSignOut?: () => void }) {
  const [workspace, setWorkspace] = useState<Workspace>();
  const [page, setPage] = useState<Page>(company.demo || company.sandbox ? "Overview" : "Policy research");
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis>();
  const [asOf, setAsOf] = useState(workspaceDate(company));
  const [selected, setSelected] = useState<string>();
  const [selectedReview, setSelectedReview] = useState<string>();
  const [reviewTopic, setReviewTopic] = useState<PolicyTopic | "all">("all");
  const [reviewStatus, setReviewStatus] = useState("pending");
  const [showUpload, setShowUpload] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [decisionTitle, setDecisionTitle] = useState(
    "Shorten the self-serve trial to 7 days",
  );
  const [days, setDays] = useState("7");
  const [topic, setTopic] = useState<PolicyTopic>("trial_duration");
  const [scope, setScope] = useState<Scope>("new");
  const [effectiveFrom, setEffectiveFrom] = useState(workspaceDate(company));
  const [approval, setApproval] = useState<"approved" | "proposed">("approved");
  const [question, setQuestion] = useState(
    "How long is the free trial for new customers?",
  );
  const [answer, setAnswer] = useState<Answer>();
  const [askScope, setAskScope] = useState<Scope>("new");
  const [docTitle, setDocTitle] = useState(company.demo || company.sandbox ? "Customer policy handbook" : "");
  const [docContent, setDocContent] = useState(
    company.demo || company.sandbox ? "New self-serve customers receive a 14-day free trial. New self-serve customers have a 30-day refund window after purchase. New self-serve customers must give 30 days of cancellation notice before renewal. New self-serve customers receive an initial support response within 24 hours." : "",
  );
  const [extraction, setExtraction] = useState<Extraction>();
  const [ownerId, setOwnerId] = useState(company.demo || company.sandbox ? "owner-product" : "owner-company");
  const [reviewNote, setReviewNote] = useState("");
  const refresh = async () => setWorkspace(await api<Workspace>("/workspace"));
  useEffect(() => {
    let active = true;
    api<Workspace>("/workspace")
      .then((data) => {
        if (active) setWorkspace(data);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [page]);
  useEffect(() => {
    if (!selected && !showUpload) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelected(undefined);
        setShowUpload(false);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [selected, showUpload]);
  useEffect(() => {
    if (!selected && !showUpload) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
    const focusables = () =>
      Array.from(
        dialog?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input, select, textarea, [tabindex="0"]',
        ) || [],
      );
    focusables()[0]?.focus();
    const trap = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const items = focusables();
      const first = items[0];
      const last = items.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", trap);
    return () => {
      document.removeEventListener("keydown", trap);
      if (previous?.isConnected) previous.focus();
    };
  }, [selected, showUpload]);
  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }
  const graph = workspace?.graph;
  const artifacts =
    graph?.nodes.filter((n) =>
      ["document", "workflow", "memory"].includes(n.kind) && !["superseded", "archived"].includes(n.status || ""),
    ) || [];
  const visibleArtifacts = artifacts.filter((n) =>
    (filter === "all" || n.kind === filter) &&
    `${n.title} ${n.content}`.toLowerCase().includes(search.toLowerCase()),
  );
  const reviews = graph?.nodes.filter((n) => n.kind === "review") || [];
  const pending = reviews.filter((n) => n.status === "pending");
  const decisions =
    graph?.nodes
      .filter((n) => n.kind === "decision")
      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")) ||
    [];
  const corrections =
    graph?.nodes
      .filter((n) => n.kind === "correction")
      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")) ||
    [];
  const visibleReviews = reviews.filter((r) => (reviewTopic === "all" || topicOf(r) === reviewTopic) && (reviewStatus === "all" || r.status === reviewStatus))
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  const review = visibleReviews.find((r) => r.id === selectedReview) || visibleReviews[0];
  const selectedNode = graph?.nodes.find((n) => n.id === selected);
  const counts = {
    conflict:
      analysis?.impacts.filter((i) => i.classification === "conflict").length ||
      0,
    review:
      analysis?.impacts.filter((i) => i.classification === "review").length ||
      0,
    unaffected:
      analysis?.impacts.filter((i) => i.classification === "unaffected")
        .length || 0,
  };
  const reviewedCount = reviews.filter((r) => ["applied", "reviewed"].includes(r.status || "")).length;
  const draftIssue = days ? decisionIssue({ topic, title: decisionTitle, value: Number(days) }) : undefined;

  function clearReport() {
    setAnalysis(undefined);
    setFilter("all");
  }
  function editTitle(title: string) {
    setDecisionTitle(title);
    const intent = decisionIntent(title);
    if (intent.topics.length === 1) {
      const detected = intent.topics[0];
      setTopic(detected);
      if (intent.value !== undefined && intent.unit === policies[detected].unit) setDays(String(intent.value));
    }
    clearReport();
  }

  function changeTopic(next: PolicyTopic) {
    setTopic(next);
    setDays(String(policies[next].suggested));
    setDecisionTitle(`Update ${policies[next].label.toLowerCase()} to ${policies[next].suggested} ${policies[next].unit}`);
    clearReport();
  }

  async function analyzeChange() {
    if (draftIssue) { setError(draftIssue); return; }
    await run(async () => {
      const result = await api<Analysis>("/decisions", {
        topic,
        title: decisionTitle,
        value: Number(days),
        scope,
        effectiveFrom,
        status: approval,
        asOf,
      });
      setAnalysis(result);
      setFilter("all");
      await refresh();
      setToast("Decision recorded. Impact analysis is ready.");
    });
  }
  async function applyReview(id: string) {
    await run(async () => {
      await api(`/reviews/${encodeURIComponent(id)}/apply`, { asOf });
      await refresh();
      setToast("Correction applied. The original is preserved in history.");
    });
  }
  async function downloadCorrection(id: string, format: "md" | "json") {
    await run(async () => {
      const result = await api<CorrectionExport>(`/reviews/${encodeURIComponent(id)}/export`);
      const blob = new Blob([format === "md" ? result.markdown : JSON.stringify(result.packet, null, 2)], { type: format === "md" ? "text/markdown;charset=utf-8" : "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a"); link.href = url; link.download = `${result.fileBase}.${format}`;
      document.body.append(link); link.click(); link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 10000);
      setToast("Correction exported with approval evidence. The external source has not been published.");
    });
  }
  const go = (target: Page) => {
    setPage(target);
    setSearch("");
    setFilter("all");
    setError("");
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            go("Overview");
          }}
        >
          <span className="brand-mark">
            <Waves size={25} />
          </span>
          ripple<span className="brand-period">.</span>
        </a>
        <button
          className="workspace-switch"
          onClick={onAccount}
        >
          <span className="workspace-avatar">{company.name.charAt(0).toUpperCase()}</span>
          <span>
            <strong>{company.name} workspace</strong>
            <small>{company.sandbox ? "Return to shared tour" : company.demo ? "Read-only demo" : "Switch company"}</small>
          </span>
          <ChevronDown size={15} />
        </button>
        <div className="nav-label">WORKSPACE</div>
        <nav aria-label="Main navigation">
          {navigation.filter((item) => (!company.demo || item.label !== "Policy research") && (company.sandbox || item.label !== "Acme website")).map(({ label, icon: Icon }) => (
            <button
              key={label}
              className={`nav-item ${page === label ? "active" : ""}`}
              onClick={() => {
                if (label === "Review queue") { setReviewTopic("all"); setReviewStatus("pending"); }
                go(label);
              }}
            >
              <Icon size={18} />
              {label}
              {label === "Review queue" && pending.length > 0 ? (
                <span className="nav-count">{pending.length}</span>
              ) : null}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="context-card">
            <span className="tiny-orbit">
              <Network size={18} />
            </span>
            <strong>Good decisions travel.</strong>
            <p>Keep the knowledge around them in sync.</p>
            <button onClick={() => go("Change studio")}>
              Trace a change <ArrowUpRight size={14} />
            </button>
          </div>
          <div className="sidebar-status">
            <Database size={15} />
            <span>
              {workspace?.health.storage === "falkordb"
                ? "FalkorDB connected"
                : "Local preview storage"}
            </span>
            <i
              className={
                workspace?.health.storage === "falkordb"
                  ? "online"
                  : "preview-dot"
              }
            />
          </div>
          <div className="profile">
            <span className="profile-avatar">{company.name.slice(0, 2).toUpperCase()}</span>
            <span>
              <strong>{company.name} team</strong>
              <small>{company.demo || company.sandbox ? "Synthetic company data" : "Private company workspace"}</small>
            </span>
            <CircleHelp
              size={17}
              onClick={() =>
                setToast(
                  company.sandbox ? "Your isolated sandbox lasts two hours. Changes stay in its own FalkorDB graph." : company.demo ? "Read-only synthetic demo. Open a judge sandbox to try changes." : "Review source evidence before approving policies or applying corrections.",
                )
              }
            />
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <ChevronRight size={14} />
            <strong>{page}</strong>
          </div>
          <div className="topbar-right">
            <span className="synthetic-label">
              <ShieldCheck size={14} />
              {company.demo || company.sandbox ? "Synthetic demo data" : "Company workspace"}
            </span>
            {onSignOut ? <button className="text-link" onClick={onSignOut}>Sign out</button> : null}
            {company.demo ? <span className="avatar-stack">
              <i>P</i>
              <i>G</i>
              <i>S</i>
            </span> : null}
          </div>
        </header>
        <main>
          {company.sandbox ? <div className="demo-banner"><span><strong>Your interactive judge sandbox.</strong> Change policies, inspect impacts, apply corrections and ask again. Synthetic data in your own FalkorDB graph; expires after two hours.</span><button onClick={onAccount}>Return to shared tour <ArrowRight size={14} /></button></div> : company.demo ? <div className="demo-banner"><span>{hostedShareDemo ? "Explore the shared Acme tour, or open your own sandbox to try policy changes and corrections." : "This Acme workspace is a read-only synthetic demo. Your company will have separate data."}</span><button onClick={onAccount}>{hostedShareDemo ? "Try your own sandbox" : "Sign in or create a company"} <ArrowRight size={14} /></button></div> : null}
          {company.sandbox ? <section className="card judge-guide"><h2>One policy changes. What else becomes wrong?</h2><p>Ripple follows document claims and workflow dependencies in FalkorDB, proposes evidence-backed fixes, and preserves the approved history. Demo date: 17 October 2026; audience: new self-serve customers.</p><div className="judge-steps">
            <button onClick={() => { setQuestion("What is our refund window?"); setAskScope("new"); setAsOf("2026-10-17"); go("Ask Ripple"); }}>1 · Ask the baseline<br /><small>Initially 30 days</small></button>
            <button onClick={() => { setTopic("refund_window"); setDays("14"); setDecisionTitle("Set refund window to 14 days"); setScope("new"); setEffectiveFrom("2026-10-17"); setAsOf("2026-10-17"); go("Change studio"); }}>2 · Record a change<br /><small>Set 14 days, then analyze</small></button>
            <button onClick={() => { setReviewTopic("refund_window"); setReviewStatus("pending"); go("Review queue"); }}>3 · Inspect & correct<br /><small>Apply a confirmed conflict</small></button>
            <button onClick={() => go("Acme website")}>4 · Publish to Acme<br /><small>See the customer copy change</small></button>
            <button onClick={() => { setQuestion("What is our refund window?"); setAskScope("new"); go("Ask Ripple"); }}>5 · Ask again<br /><small>14 days with decision evidence</small></button>
          </div><p>{workspace?.graph.nodes.filter((n) => n.kind === "correction").length || 0} corrections saved · {workspace?.graph.nodes.filter((n) => n.kind === "publication" && n.status === "published").length || 0} published copies. Refresh to verify persistence. Try Policy research and Knowledge library for imports; use Enterprise or 1 October to test exceptions and history.</p><button className="text-link" disabled={busy} onClick={() => { if (window.confirm("Delete this disposable sandbox and its changes? Export any corrections first. You can then start a fresh one.")) void run(async () => { await api("/release", {}); sessionStorage.removeItem("ripple-judge-active"); onAccount(); }); }}>Finish & release sandbox</button></section> : null}
          {workspace?.health.storage === "preview" ? (
            <div className="preview-banner">
              <Database size={15} />
              <span>
                <strong>Development preview.</strong> Uses a local graph
                simulator. Connect FalkorDB Cloud for the real graph-backed
                submission.
              </span>
              <button
                onClick={() =>
                  setToast(
                    "Set RIPPLE_MODE=falkordb and FALKORDB_URL in .env, then restart npm run dev.",
                  )
                }
              >
                Connection setup <ArrowUpRight size={13} />
              </button>
            </div>
          ) : null}
          {error ? (
            <div className="error-banner" role="alert">
              <span>{error}</span>
              <button aria-label="Dismiss error" onClick={() => setError("")}>
                <X size={16} />
              </button>
            </div>
          ) : null}
          {!workspace ? (
            <div className="loading-page">
              {error ? (
                <>
                  <Database size={35} />
                  <h2>Let’s connect your workspace</h2>
                  <p>Check the API and database configuration, then retry.</p>
                  <button className="primary" onClick={() => run(refresh)}>
                    Retry connection
                  </button>
                </>
              ) : (
                <>
                  <LoaderCircle className="spin" />
                  <p>Connecting the dots…</p>
                </>
              )}
            </div>
          ) : (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">
                    <span />
                    {page === "Overview"
                      ? "YOUR COMPANY, IN CONTEXT"
                      : `CONNECTED KNOWLEDGE · ${company.name.toUpperCase()}`}
                  </div>
                  <h1>
                    {page === "Acme website" ? "From approved fix to published copy." : page === "Policy research" ? "Know the source. Then decide." : page === "Overview"
                      ? "See the whole ripple."
                      : page === "Change studio"
                        ? "One change. Every connection."
                        : page === "Knowledge library"
                          ? "Knowledge with context."
                          : page === "Review queue"
                            ? "Make the right corrections."
                            : page === "Decision log"
                              ? "Every decision has a story."
                              : "Answers that know what changed."}
                  </h1>
                  <p>
                    {page === "Policy research" ? "Research your company's public policies and approve the evidence that should guide its agents." : page === "Overview"
                      ? "Understand what changes, what it touches, and what needs your attention."
                      : page === "Change studio"
                        ? "Record a decision. Trace its impact. Keep everyone on the same page."
                        : page === "Knowledge library"
                          ? "Documents, workflows, and agent memory—connected to their sources."
                          : page === "Review queue"
                            ? "Evidence first. You decide what gets updated."
                            : page === "Decision log"
                              ? "A persistent record of policy changes and the work they set in motion."
                              : "Retrieve approved policies and the decisions behind them, even in a fresh session."}
                  </p>
                </div>
                <div className="heading-action">
                  {page === "Knowledge library" ? (
                    <button
                      className="primary"
                      disabled={company.demo}
                      onClick={() => {
                        setShowUpload(true);
                        setExtraction(undefined);
                      }}
                    >
                      <Plus size={17} />
                      Add document
                    </button>
                  ) : page === "Overview" ? (
                    <button
                      className="primary"
                      onClick={() => go("Change studio")}
                    >
                      <Plus size={17} />
                      Trace a change
                    </button>
                  ) : null}
                </div>
              </div>

              {page === "Policy research" ? <CompanyResearch company={company} graph={graph!} onImported={refresh} /> : null}
              {page === "Acme website" && company.sandbox ? <AcmeSite graph={graph!} refresh={refresh} /> : null}
              {page === "Overview" ? (
                <>
                  <div className="stats-grid">
                    <Stat
                      label="Connected knowledge"
                      value={artifacts.length}
                      detail="Documents, workflows & memory"
                      icon={<BookOpen size={18} />}
                    />
                    <Stat
                      label="Decisions recorded"
                      value={decisions.length}
                      detail="With policy versions & evidence"
                      icon={<GitBranch size={18} />}
                    />
                    <Stat
                      label="Waiting for review"
                      value={pending.length}
                      detail="Changes that need a human touch"
                      icon={<Clock3 size={18} />}
                      warning={pending.length > 0}
                    />
                    <Stat
                      label="Reviews completed"
                      value={reviewedCount}
                      detail="Originals preserved in history"
                      icon={<ShieldCheck size={18} />}
                    />
                  </div>
                  <div className="overview-grid">
                    <section className="card graph-card">
                      <div className="card-heading">
                        <div>
                          <h2>
                            Your knowledge, connected{" "}
                            <span className="live-label">
                              <i />
                              {workspace.health.storage === "falkordb"
                                ? "LIVE GRAPH"
                                : "PREVIEW"}
                            </span>
                          </h2>
                          <p>Explore policies and the knowledge that depends on them.</p>
                        </div>
                        <Network size={18} />
                      </div>
                      <label className="map-topic-selector">
                        Graph policy area
                        <select value={topic} disabled={busy} onChange={(e) => changeTopic(e.target.value as PolicyTopic)}>
                          {policyTopics.map((key) => <option key={key} value={key}>{policies[key].label}</option>)}
                        </select>
                      </label>
                      <KnowledgeMap
                        dynamic={!company.demo}
                        topic={topic}
                        asOf={asOf}
                        graph={graph!}
                        impacts={analysis?.impacts}
                        onSelect={setSelected}
                      />
                    </section>
                    <section className="card attention-card">
                      <div className="card-heading">
                        <div>
                          <h2>Needs your attention</h2>
                          <p>The next useful thing to do.</p>
                        </div>
                        <span className="number-bubble">{pending.length}</span>
                      </div>
                      {pending.length ? (
                        <div className="attention-list">
                          {pending.slice(0, 4).map((item) => (
                            <button
                              key={item.id}
                              onClick={() => {
                                setSelectedReview(item.id);
                                go("Review queue");
                              }}
                            >
                              <span
                                className={`artifact-icon ${item.classification}`}
                              >
                                <FileText size={18} />
                              </span>
                              <span>
                                <strong>{item.title}</strong>
                                <small>
                                  {statusLabel(item.classification)}
                                </small>
                              </span>
                              <ChevronRight size={16} />
                            </button>
                          ))}
                          <button
                            className="text-link"
                            onClick={() => go("Review queue")}
                          >
                            Open review queue <ArrowRight size={15} />
                          </button>
                        </div>
                      ) : (
                        <div className="first-change">
                          <span className="orbit-illustration">
                            <span />
                            <span />
                            <span />
                            <GitBranch size={30} />
                          </span>
                          <h3>Start with a small change.</h3>
                          <p>
                            {company.demo ? "This demo shows how policy decisions connect to company knowledge." : "Start by researching your official website and approving the findings that should guide your agents."}
                          </p>
                          <button
                            className="secondary"
                            onClick={() => company.demo ? onAccount() : go("Policy research")}
                          >
                            {company.demo && hostedShareDemo ? "Try your own sandbox" : company.demo ? "Create your company workspace" : "Research company policies"} <ArrowRight size={15} />
                          </button>
                        </div>
                      )}
                    </section>
                  </div>
                  <div className="bottom-grid">
                    <section className="card">
                      <div className="card-heading">
                        <div>
                          <h2>Recent activity</h2>
                          <p>A clear trail of what happened.</p>
                        </div>
                        <button
                          className="text-link"
                          onClick={() => go("Decision log")}
                        >
                          View log <ArrowUpRight size={14} />
                        </button>
                      </div>
                      {decisions.length || corrections.length ? (
                        <div className="activity-list">
                          {[...decisions, ...corrections]
                            .sort((a, b) =>
                              (b.createdAt || "").localeCompare(
                                a.createdAt || "",
                              ),
                            )
                            .slice(0, 3)
                            .map((item) => (
                              <div key={item.id}>
                                <span className="activity-dot">
                                  <Activity size={15} />
                                </span>
                                <span>
                                  <strong>{item.title}</strong>
                                  <small>
                                    {item.kind === "decision"
                                      ? "Decision recorded"
                                      : "Review completed"}{" "}
                                    · {dateLabel(item.createdAt)}
                                  </small>
                                </span>
                                <Badge value={item.status} />
                              </div>
                            ))}
                        </div>
                      ) : (
                        <div className="seed-activity">
                          <span className="activity-dot">
                            <Check size={16} />
                          </span>
                          <div>
                            <strong>Your demo workspace is ready</strong>
                            <p>
                              {artifacts.length} knowledge items connected to
                              company policies and owner roles.
                            </p>
                          </div>
                          <span className="muted">Ready to explore</span>
                        </div>
                      )}
                    </section>
                    <section className="principle-card">
                      <span className="eyebrow">BUILT ON EVIDENCE</span>
                      <h3>
                        Every “why”
                        <br />
                        has a path.
                      </h3>
                      <p>
                        Open any impact result to see the real connections
                        behind it.
                      </p>
                      <span className="path-mini">
                        Decision <ArrowRight size={14} /> Policy{" "}
                        <ArrowRight size={14} /> Knowledge
                      </span>
                    </section>
                  </div>
                </>
              ) : null}

              {page === "Change studio" ? (
                <div className="studio-layout">
                  <section className="card decision-form">
                    <div className="card-heading">
                      <div>
                        <h2>
                          <GitBranch size={18} />
                          New policy decision
                        </h2>
                        <p>Choose a policy area, audience, and effective date.</p>
                      </div>
                    </div>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        void analyzeChange();
                      }}
                    >
                      <label>
                        Policy area
                        <select value={topic} disabled={busy} onChange={(e) => changeTopic(e.target.value as PolicyTopic)}>
                          {policyTopics.map((key) => <option key={key} value={key}>{policies[key].label}</option>)}
                        </select>
                      </label>
                      <label>
                        Decision title
                        <input
                          required
                          minLength={3}
                          maxLength={160}
                          value={decisionTitle}
                          disabled={busy}
                          onChange={(e) => editTitle(e.target.value)}
                          aria-describedby="decision-routing-hint"
                        />
                      </label>
                      <p id="decision-routing-hint" className="muted form-help">Mentioning a supported policy and duration in the title fills the matching fields. Review them before saving. “Return policy” means the refund eligibility window.</p>
                      <div className="form-two">
                        <label>
                          {policies[topic].label}
                          <span className="input-unit">
                            <input
                              type="number"
                              required
                              min={1}
                              max={365}
                              step={1}
                              value={days}
                              disabled={busy}
                              onChange={(e) => {
                                setDays(e.target.value);
                                setDecisionTitle((title) => withDecisionValue(title, e.target.value));
                                clearReport();
                              }}
                            />
                            <span>{policies[topic].unit}</span>
                          </span>
                        </label>
                        <label>
                          Decision status
                          <select
                            value={approval}
                            disabled={busy}
                            onChange={(e) =>
                              { setApproval(e.target.value as typeof approval); clearReport(); }
                            }
                          >
                            <option value="approved">Approved</option>
                            <option value="proposed">Proposed</option>
                          </select>
                        </label>
                      </div>
                      <label>
                        Applies to
                        <select
                          value={scope}
                          disabled={busy}
                          onChange={(e) => { setScope(e.target.value as Scope); clearReport(); }}
                        >
                          <option value="new">New self-serve customers</option>
                          <option value="enterprise">
                            Enterprise customers
                          </option>
                          <option value="all">All customers</option>
                        </select>
                      </label>
                      <div className="form-two">
                        <label>
                          Effective from
                          <input
                            type="date"
                            required
                            value={effectiveFrom}
                            disabled={busy}
                            onChange={(e) => { setEffectiveFrom(e.target.value); clearReport(); }}
                          />
                        </label>
                        <label>
                          Analyze as of
                          <input
                            type="date"
                            required
                            value={asOf}
                            disabled={busy}
                            onChange={(e) => { setAsOf(e.target.value); clearReport(); }}
                          />
                        </label>
                      </div>
                      {draftIssue ? <p className="notice" role="alert">{draftIssue}</p> : null}
                      {days && !draftIssue ? <div className="decision-preview" role="status"><strong>{company.demo ? "Draft preview" : "Ready to record"} · {policies[topic].label}</strong><p>{policyStatement(topic, Number(days), scope)}</p>{company.demo ? <p>Open your own sandbox using the banner above to record and analyze this change.</p> : null}</div> : null}
                      <div className="form-note">
                        <ShieldCheck size={17} />
                        <span>
                          Proposals and future policies won’t override current
                          knowledge. Audience exceptions stay intact.
                        </span>
                      </div>
                      <button
                        className="primary full"
                        disabled={busy || !!draftIssue || company.demo}
                        type="submit"
                      >
                        {busy ? (
                          <LoaderCircle className="spin" size={17} />
                        ) : (
                          <Sparkles size={17} />
                        )}
                        Record & analyze change <ArrowRight size={17} />
                      </button>
                    </form>
                  </section>
                  <div className="analysis-column">
                    {analysis ? (
                      <>
                        <div className="analysis-top">
                          <span className="eyebrow">IMPACT REPORT</span>
                          <Badge value={analysis.decision.status} />
                        </div>
                        <h2 className="analysis-title">
                          {policies[topicOf(analysis.decision)].label} impact
                        </h2>
                        <p className="report-context">{analysis.decision.title} · {analysis.decision.value} {policies[topicOf(analysis.decision)].unit} · {scopeLabel(analysis.decision.scope)} · as of {analysis.asOf || asOf}</p>
                        {analysis.notice ? (
                          <div className="notice">{analysis.notice}</div>
                        ) : null}
                        <div className="impact-counts">
                          {(["conflict", "review", "unaffected"] as const).map(
                            (type) => (
                              <button
                                key={type}
                                className={filter === type ? "selected" : ""}
                                onClick={() =>
                                  setFilter(filter === type ? "all" : type)
                                }
                              >
                                <strong>{counts[type]}</strong>
                                <Badge value={type} />
                              </button>
                            ),
                          )}
                        </div>
                        <section className="card impact-list">
                          {analysis.impacts
                            .filter(
                              (i) =>
                                filter === "all" || i.classification === filter,
                            )
                            .map((impact) => (
                              <ImpactRow
                                key={impact.artifact.id}
                                impact={impact}
                                onOpen={() => setSelected(impact.artifact.id)}
                                onReview={() => {
                                  setSelectedReview(impact.reviewId);
                                  setReviewTopic(topicOf(analysis.decision));
                                  setReviewStatus("all");
                                  go("Review queue");
                                }}
                              />
                            ))}
                        </section>
                        <Trace steps={analysis.trace} />
                        <button
                          className="text-link"
                          disabled={busy || company.demo}
                          onClick={() =>
                            run(async () => {
                              setAnalysis(
                                await api(
                                  `/decisions/${analysis.decision.id}/analyze`,
                                  { asOf },
                                ),
                              );
                              await refresh();
                            })
                          }
                        >
                          Refresh this analysis <ArrowRight size={14} />
                        </button>
                      </>
                    ) : (
                      <section className="card studio-empty">
                        <span className="orbit-illustration">
                          <span />
                          <span />
                          <span />
                          <Network size={32} />
                        </span>
                        <h2>
                          Follow the decision.
                          <br />
                          Find the consequences.
                        </h2>
                        <p>
                          Ripple traces connected claims, documents, and
                          workflows. You get evidence-backed corrections and a
                          separate queue for human judgment.
                        </p>
                        <div className="steps">
                          <span>
                            <i>1</i>Record the change
                          </span>
                          <span>
                            <i>2</i>Follow the graph
                          </span>
                          <span>
                            <i>3</i>Review the fixes
                          </span>
                        </div>
                        <div className="example-note">
                          <strong>Try the prefilled example</strong>
                          <p>
                            Each policy has its own documents, saved replies, and operational dependencies. Results are discovered from its graph neighborhood; counts depend on your saved changes.
                          </p>
                        </div>
                      </section>
                    )}
                  </div>
                </div>
              ) : null}

              {page === "Knowledge library" ? (
                <>
                  <div className="list-toolbar">
                    <div className="search-field">
                      <Search size={17} />
                      <input
                        aria-label="Search knowledge"
                        placeholder="Search your knowledge…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </div>
                    <div className="segmented">
                      {["all", "document", "workflow", "memory"].map((type) => (
                        <button
                          key={type}
                          className={filter === type ? "selected" : ""}
                          onClick={() => setFilter(type)}
                        >
                          {type === "all"
                            ? "All knowledge"
                            : type === "memory"
                              ? "Agent memory"
                              : `${type}s`}
                        </button>
                      ))}
                    </div>
                  </div>
                  <section className="card knowledge-table">
                    <div className="table-head">
                      <span>KNOWLEDGE ITEM</span>
                      <span>OWNER</span>
                      <span>AUDIENCE</span>
                      <span>REVISION</span>
                    </div>
                    {!visibleArtifacts.length ? <div role="status"><Empty title="No records found" text="Try another search or choose a different knowledge type." /></div> : null}
                    {visibleArtifacts
                      .map((n) => (
                        <button
                          className="table-row"
                          key={n.id}
                          onClick={() => setSelected(n.id)}
                        >
                          <span>
                            <span className={`artifact-icon ${n.kind}`}>
                              <FileText size={18} />
                            </span>
                            <span>
                              <strong>{n.title}</strong>
                              <small>
                                {n.kind === "memory" ? "Saved agent reply" : n.kind === "workflow" ? "Operational workflow" : "Source document"}{n.sourceSystem ? ` · ${n.sourceSystem}` : ""}
                              </small>
                            </span>
                          </span>
                          <span>
                            {
                              graph!.nodes.find((o) => o.id === n.ownerId)
                                ?.title
                            }
                          </span>
                          <span>{scopeLabel(n.scope)}</span>
                          <span>
                            v{n.revision}
                            <ChevronRight size={15} />
                          </span>
                        </button>
                      ))}
                  </section>
                </>
              ) : null}

              {page === "Review queue" ? (
                reviews.length ? (
                  <div className="review-layout">
                    <section className="card review-list">
                      <div className="card-heading">
                        <h2>Review items</h2>
                        <span className="number-bubble">{visibleReviews.length}</span>
                      </div>
                      <div className="review-filters">
                        <label>Review policy area<select value={reviewTopic} onChange={(e) => { setReviewTopic(e.target.value as PolicyTopic | "all"); setSelectedReview(undefined); setReviewNote(""); }}><option value="all">All policy areas</option>{policyTopics.map((key) => <option key={key} value={key}>{policies[key].label}</option>)}</select></label>
                        <label>Review status<select value={reviewStatus} onChange={(e) => { setReviewStatus(e.target.value); setSelectedReview(undefined); setReviewNote(""); }}><option value="pending">Pending</option><option value="applied">Applied</option><option value="reviewed">Owner reviewed</option><option value="stale">Superseded / stale</option><option value="all">All history</option></select></label>
                      </div>
                      {!visibleReviews.length ? <p className="review-empty">No reviews match these filters. Choose another policy area or open All history.</p> : null}
                      {visibleReviews
                        .map((item) => (
                          <button
                            className={`review-item ${review?.id === item.id ? "selected" : ""}`}
                            key={item.id}
                            onClick={() => {
                              setSelectedReview(item.id);
                              setReviewNote("");
                            }}
                          >
                            <span className="review-item-top">
                              <FileText size={16} />
                              <Badge
                                value={
                                  item.status === "pending"
                                    ? item.classification
                                    : item.status
                                }
                              />
                            </span>
                            <strong>{item.title}</strong>
                            <small>{policies[topicOf(item)].label} · {dateLabel(item.createdAt)}</small>
                            <small>{graph!.nodes.find((n) => n.id === item.decisionId)?.title}</small>
                          </button>
                        ))}
                    </section>
                    {review ? (
                      <section className="card correction-panel">
                        <div className="card-heading">
                          <div>
                            <span className="eyebrow">REVIEW WORKSPACE</span>
                            <h2>{review.title}</h2>
                          </div>
                          <Badge
                            value={
                              review.status === "pending"
                                ? review.classification
                                : review.status
                            }
                          />
                        </div>
                        <div className="correction-body">
                          <p className="report-context">{policies[topicOf(review)].label} · {graph!.nodes.find((n) => n.id === review.decisionId)?.title}</p>
                          <p className="reason-box">{review.reason}</p>
                          <h3 className="small-heading">EVIDENCE PATH</h3>
                          <Evidence
                            ids={review.path || []}
                            graph={graph!}
                            onSelect={setSelected}
                          />
                          <div className="diff-grid">
                            <div>
                              <div className="diff-title">
                                <span className="dot-before" />
                                ORIGINAL · v{review.sourceRevision}
                              </div>
                              <p>{review.original}</p>
                            </div>
                            <div className="proposed">
                              <div className="diff-title">
                                <span className="dot-after" />
                                {review.proposed
                                  ? "PROPOSED CORRECTION"
                                  : "OWNER REVIEW REQUIRED"}
                              </div>
                              <p>
                                {review.proposed ||
                                  "A connected workflow may need to change. Inspect its behavior and record your review below; Ripple will not invent a replacement."}
                              </p>
                            </div>
                          </div>
                          {review.status === "pending" ? (
                            review.proposed ? (
                              <div className="correction-footer">
                                <p>
                                  <History size={15} />
                                  The original text will be preserved.
                                </p>
                                <button
                                  className="primary"
                                  disabled={busy || company.demo}
                                  onClick={() => applyReview(review.id)}
                                >
                                  {busy ? (
                                    <LoaderCircle size={16} className="spin" />
                                  ) : (
                                    <Check size={16} />
                                  )}
                                  Approve & apply correction
                                </button>
                              </div>
                            ) : (
                              <form
                                className="owner-review"
                                onSubmit={(e) => {
                                  e.preventDefault();
                                  void run(async () => {
                                    await api(
                                      `/reviews/${encodeURIComponent(review.id)}/resolve`,
                                      { note: reviewNote },
                                    );
                                    await refresh();
                                    setReviewNote("");
                                    setToast(
                                      "Owner review recorded. Workflow content was not automatically rewritten.",
                                    );
                                  });
                                }}
                              >
                                <label>
                                  Review note
                                  <textarea
                                    required
                                    minLength={5}
                                    maxLength={1000}
                                    value={reviewNote}
                                    onChange={(e) =>
                                      setReviewNote(e.target.value)
                                    }
                                    placeholder="What did you check, and what needs to happen next?"
                                  />
                                </label>
                                <button className="primary" disabled={busy || company.demo}>
                                  Record owner review <Check size={16} />
                                </button>
                              </form>
                            )
                          ) : (
                            <div className="resolved-note">
                              <ShieldCheck size={18} />
                              This review is {review.status}. Its evidence and
                              original text remain in the decision history.
                            </div>
                          )}
                          {review.status === "applied" && review.classification === "conflict" ? <div className="correction-export"><p>Hand the approved correction to the document owner. Includes source, policy, graph evidence and a content checksum; downloading does not update the external source.</p><button className="secondary" disabled={busy} onClick={() => void downloadCorrection(review.id, "md")}><Download size={16} />Export correction (.md)</button><button className="text-link" disabled={busy} onClick={() => void downloadCorrection(review.id, "json")}>Download JSON</button></div> : null}
                        </div>
                      </section>
                    ) : null}
                  </div>
                ) : (
                  <section className="card">
                    <Empty
                      title="A clear queue, for now."
                      text="Record a policy change in the Change studio to find conflicting content and dependencies that need review."
                    />
                    <div className="empty-action">
                      <button
                        className="primary"
                        onClick={() => go("Change studio")}
                      >
                        Trace your first change <ArrowRight size={16} />
                      </button>
                    </div>
                  </section>
                )
              ) : null}

              {page === "Decision log" ? (
                <div className="history-layout">
                  <section className="card">
                    <div className="card-heading">
                      <div>
                        <h2>Policy decisions</h2>
                        <p>Approved and proposed versions are retained.</p>
                      </div>
                      <GitBranch size={18} />
                    </div>
                    {decisions.length ? (
                      <div className="decision-timeline">
                        {decisions.map((d) => (
                          <article key={d.id}>
                            <span className="timeline-dot">
                              <GitBranch size={17} />
                            </span>
                            <div>
                              <div className="decision-title">
                                <h3>{d.title}</h3>
                                <Badge value={d.status} />
                              </div>
                              <p>
                                {policies[topicOf(d)].label}: {d.value} {policies[topicOf(d)].unit} · {scopeLabel(d.scope)} ·
                                Effective {dateLabel(d.effectiveFrom)}
                              </p>
                              <small>Recorded {dateLabel(d.createdAt)}</small>
                              {d.originalTitle ? <p className="muted">Original title: {d.originalTitle}</p> : null}
                              {d.status === "invalid" ? <p className="notice">{d.reason}</p> : null}
                              <button
                                className="text-link"
                                disabled={busy || d.status === "invalid" || company.demo}
                                onClick={() =>
                                  run(async () => {
                                    setTopic(topicOf(d));
                                    setDecisionTitle(d.title);
                                    setDays(String(d.value));
                                    setScope(d.scope!);
                                    setEffectiveFrom(d.effectiveFrom!);
                                    setApproval(d.status === "proposed" ? "proposed" : "approved");
                                    setFilter("all");
                                    setAnalysis(
                                      await api(`/decisions/${d.id}/analyze`, {
                                        asOf,
                                      }),
                                    );
                                    await refresh();
                                    go("Change studio");
                                  })
                                }
                              >
                                Open impact report <ArrowRight size={14} />
                              </button>
                            </div>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <Empty
                        title="Your next decision starts the story."
                        text="Record a change to build a traceable history of how company knowledge evolves."
                      />
                    )}
                  </section>
                  <section className="card">
                    <div className="card-heading">
                      <div>
                        <h2>Correction history</h2>
                        <p>Previous content is preserved.</p>
                      </div>
                      <History size={18} />
                    </div>
                    {corrections.length ? (
                      <div className="correction-history">
                        {corrections.map((c) => (
                          <details key={c.id}>
                            <summary>
                              <Check size={15} />
                              <strong>{c.title}</strong>
                              <small>{dateLabel(c.createdAt)}</small>
                            </summary>
                            {c.original ? (
                              <>
                                <h4>Before</h4>
                                <p>{c.original}</p>
                                <h4>After</h4>
                                <p>{c.proposed}</p>
                              </>
                            ) : (
                              <p>{c.content}</p>
                            )}
                          </details>
                        ))}
                      </div>
                    ) : (
                      <Empty
                        title="No corrections yet."
                        text="Accepted corrections and owner review notes will appear here."
                      />
                    )}
                  </section>
                </div>
              ) : null}

              {page === "Ask Ripple" ? (
                <div className="ask-layout">
                  <section className="card ask-panel">
                    <div className="card-heading">
                      <div>
                        <h2>
                          <Sparkles size={18} />
                          Ask your company brain
                        </h2>
                        <p>
                          {workspace.health.model
                            ? `Model selects a read-only graph tool · ${workspace.health.model}`
                            : "Structured lookup mode · no model key configured"}
                        </p>
                      </div>
                      <span className="live-label">
                        <i />
                        PERSISTENT CONTEXT
                      </span>
                    </div>
                    <div className="ask-body">
                      <div className="ask-intro">
                        <span className="ask-logo">
                          <Waves size={26} />
                        </span>
                        <h2>
                          What’s true now?
                          <br />
                          And what changed?
                        </h2>
                        <p>
                          Ask about trials, refund windows, cancellation notice, or support response times. Answers use approved policy
                          versions, audience scope, and your selected date.
                        </p>
                      </div>
                      <div className="suggestions">
                        <button
                          onClick={() => {
                            setQuestion(
                              "How long is the free trial for new customers?",
                            );
                            setAnswer(undefined);
                            setAskScope("new");
                          }}
                        >
                          How long is the self-serve trial?{" "}
                          <ArrowUpRight size={14} />
                        </button>
                        {policyTopics.filter((key) => key !== "trial_duration").map((key) => (
                          <button key={key} onClick={() => { setQuestion(policies[key].question); setAnswer(undefined); }}>
                            {policies[key].question} <ArrowUpRight size={14} />
                          </button>
                        ))}
                        <button
                          onClick={() =>
                            { setQuestion("What is our pricing policy?"); setAnswer(undefined); }
                          }
                        >
                          What is our pricing policy? <ArrowUpRight size={14} />
                        </button>
                      </div>
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          void run(async () =>
                            setAnswer(
                              await api("/ask", {
                                question,
                                scope: askScope,
                                asOf,
                              }),
                            ),
                          );
                        }}
                      >
                        <div className="form-two">
                          <label>
                            Customer group
                            <select
                              value={askScope}
                              disabled={busy}
                              onChange={(e) =>
                                { setAskScope(e.target.value as Scope); setAnswer(undefined); }
                              }
                            >
                              <option value="new">New self-serve</option>
                              <option value="enterprise">Enterprise</option>
                            </select>
                          </label>
                          <label>
                            As of date
                            <input
                              type="date"
                              required
                              value={asOf}
                              disabled={busy}
                              onChange={(e) => { setAsOf(e.target.value); setAnswer(undefined); clearReport(); }}
                            />
                          </label>
                        </div>
                        <label className="question-field">
                          <span className="sr-only">Your question</span>
                          <textarea
                            required
                            minLength={3}
                            maxLength={2000}
                            value={question}
                            disabled={busy}
                            onChange={(e) => { setQuestion(e.target.value); setAnswer(undefined); }}
                          />
                          <button
                            className="primary"
                            disabled={busy}
                            aria-label="Ask Ripple"
                          >
                            {busy ? (
                              <LoaderCircle className="spin" size={18} />
                            ) : (
                              <ArrowRight size={18} />
                            )}
                          </button>
                        </label>
                      </form>
                      {answer ? (
                        <div className="answer" aria-live="polite">
                          <div className="answer-label">
                            <Sparkles size={15} />
                            <strong>Ripple</strong>
                            <small>
                              {answer.mode === "guidance" ? "Getting started" : answer.mode === "model"
                                ? "Model-routed graph lookup"
                                : "Structured graph lookup"}
                            </small>
                          </div>
                          <p>{answer.text}</p>
                          {answer.sources.length ? (
                            <div className="answer-sources">
                              {answer.sources.map((s) => (
                                <button
                                  key={s.id}
                                  onClick={() => setSelected(s.id)}
                                >
                                  <FileText size={14} />
                                  {s.title}
                                  <ArrowUpRight size={12} />
                                </button>
                              ))}
                            </div>
                          ) : null}
                          {answer.trace.length ? <Trace steps={answer.trace} /> : null}
                        </div>
                      ) : null}
                    </div>
                  </section>
                  <div className="ask-side">
                    <ShieldCheck size={24} />
                    <h3>Evidence over guesswork.</h3>
                    <p>
                      Only approved, applicable policies can support an answer.
                      Unmodeled topics get a clear “I don’t know.”
                    </p>
                    <hr />
                    <History size={23} />
                    <h3>Memory that survives the chat.</h3>
                    <p>
                      Open a fresh page and ask again. Decisions and corrections
                      live in the workspace graph.
                    </p>
                  </div>
                </div>
              ) : null}
            </>
          )}
          <footer className="page-footer">
            <span>
              <Waves size={13} />
              Ripple · Context that stays connected
            </span>
            <span>
              Built for Graph Hacks 2026{" "}
              <span className="footer-separator">/</span>{" "}
              {workspace?.health.storage === "falkordb"
                ? "Powered by FalkorDB"
                : "FalkorDB connection pending"}
            </span>
          </footer>
        </main>
      </div>
      {busy ? (
        <div className="working" role="status">
          <LoaderCircle size={15} className="spin" />
          Working through the connections…
        </div>
      ) : null}
      {toast ? (
        <div className="toast" role="status">
          <Check size={17} />
          {toast}
          <button
            onClick={() => setToast("")}
            aria-label="Dismiss notification"
          >
            <X size={15} />
          </button>
        </div>
      ) : null}
      {selectedNode ? (
        <div className="modal-backdrop" onClick={() => setSelected(undefined)}>
          <section
            className="modal detail-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="detail-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close"
              autoFocus
              onClick={() => setSelected(undefined)}
              aria-label="Close detail"
            >
              <X size={20} />
            </button>
            <span className="eyebrow">
              {selectedNode.kind.toUpperCase()} · SOURCE DETAIL
            </span>
            <h2 id="detail-title">{selectedNode.title}</h2>
            <div className="detail-meta">
              {selectedNode.sourceSystem ? <span>{selectedNode.sourceSystem}</span> : null}
              <Badge value={selectedNode.status} />
              {selectedNode.scope ? (
                <span>{scopeLabel(selectedNode.scope)}</span>
              ) : null}
              {selectedNode.revision ? (
                <span>Revision {selectedNode.revision}</span>
              ) : null}
            </div>
            <p className="source-content">
              {selectedNode.content ||
                selectedNode.quote ||
                `A connected policy owner in the ${company.name} workspace.`}
            </p>
            {selectedNode.sourceUrl ? <p><a href={selectedNode.sourceUrl} target="_blank" rel="noreferrer">View original company source <ArrowUpRight size={14} /></a>{selectedNode.retrievedAt ? <small> · Retrieved {dateLabel(selectedNode.retrievedAt)}</small> : null}</p> : null}
            {selectedNode.value ? (
              <div className="policy-fact">
                <strong>{selectedNode.value}</strong>
                <span>
                  {policies[topicOf(selectedNode)].unit} · {policies[topicOf(selectedNode)].label}
                  {selectedNode.effectiveFrom
                    ? ` · effective ${dateLabel(selectedNode.effectiveFrom)}`
                    : ""}
                </span>
              </div>
            ) : null}
            {analysis?.impacts.find(
              (i) => i.artifact.id === selectedNode.id,
            ) ? (
              <>
                <h3>Impact evidence</h3>
                <p>
                  {
                    analysis.impacts.find(
                      (i) => i.artifact.id === selectedNode.id,
                    )!.reason
                  }
                </p>
                <Evidence
                  ids={
                    analysis.impacts.find(
                      (i) => i.artifact.id === selectedNode.id,
                    )!.path.ids
                  }
                  graph={graph!}
                  onSelect={setSelected}
                />
              </>
            ) : null}
            <small className="source-id">Graph ID: {selectedNode.id}</small>
          </section>
        </div>
      ) : null}
      {showUpload ? (
        <div className="modal-backdrop" onClick={() => setShowUpload(false)}>
          <section
            className="modal upload-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="upload-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close"
              onClick={() => setShowUpload(false)}
              aria-label="Close document form"
            >
              <X size={20} />
            </button>
            <span className="eyebrow">GROW YOUR COMPANY CONTEXT</span>
            <h2 id="upload-title">Connect a new document.</h2>
            <p>
              Paste fictional or permitted public content. Extract claims,
              review them, then add them to the graph.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void run(async () =>
                  setExtraction(
                    await api("/documents/extract", {
                      title: docTitle,
                      content: docContent,
                    }),
                  ),
                );
              }}
            >
              <label>
                Document title
                <input
                  autoFocus
                  required
                  minLength={3}
                  maxLength={160}
                  value={docTitle}
                  onChange={(e) => {
                    setDocTitle(e.target.value);
                    setExtraction(undefined);
                  }}
                />
              </label>
              <label>
                Content
                <textarea
                  required
                  minLength={10}
                  maxLength={20000}
                  rows={5}
                  value={docContent}
                  onChange={(e) => {
                    setDocContent(e.target.value);
                    setExtraction(undefined);
                  }}
                />
              </label>
              <label>
                Owner
                <select
                  value={ownerId}
                  onChange={(e) => setOwnerId(e.target.value)}
                >
                  {graph?.nodes
                    .filter((n) => n.kind === "owner")
                    .map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.title}
                      </option>
                    ))}
                </select>
              </label>
              <button className="secondary" disabled={busy}>
                <Sparkles size={16} />
                Extract policy claims
              </button>
            </form>
            {extraction ? (
              <div className="extraction-result">
                <h3>
                  Review extracted claims{" "}
                  <span className="number-bubble">
                    {extraction.claims.length}
                  </span>
                </h3>
                <p className="muted">Method: {extraction.method}</p>
                {extraction.warning ? (
                  <div className="notice">{extraction.warning}</div>
                ) : null}
                {extraction.claims.length ? (
                  extraction.claims.map((c, i) => (
                    <div className="extracted-claim" key={i}>
                      <label>
                        <input
                          type="checkbox"
                          checked
                          onChange={() =>
                            setExtraction({
                              ...extraction,
                              claims: extraction.claims.filter(
                                (_, index) => index !== i,
                              ),
                            })
                          }
                        />
                        {policies[topicOf(c)].label}: {c.value} {policies[topicOf(c)].unit} · {scopeLabel(c.scope)}
                      </label>
                      <blockquote>“{c.quote}”</blockquote>
                    </div>
                  ))
                ) : (
                  <p>
                    No supported claims found. This document can be stored, but
                    won’t have policy dependency links.
                  </p>
                )}
                <button
                  className="primary full"
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      await api("/documents", { ...extraction, ownerId });
                      await refresh();
                      setShowUpload(false);
                      setExtraction(undefined);
                      setToast(
                        "Document connected. Refresh a decision analysis to include its claims.",
                      );
                    })
                  }
                >
                  <Check size={16} />I reviewed these claims · add to graph
                </button>
              </div>
            ) : null}
          </section>
        </div>
      ) : null}
    </div>
  );
}

function Stat({
  label,
  value,
  detail,
  icon,
  warning,
}: {
  label: string;
  value: number;
  detail: string;
  icon: React.ReactNode;
  warning?: boolean;
}) {
  return (
    <div className={`stat-card ${warning ? "warning" : ""}`}>
      <div>
        <span>{label}</span>
        {icon}
      </div>
      <strong>{String(value).padStart(2, "0")}</strong>
      <p>{detail}</p>
    </div>
  );
}
function ImpactRow({
  impact,
  onOpen,
  onReview,
}: {
  impact: Impact;
  onOpen: () => void;
  onReview: () => void;
}) {
  return (
    <article className="impact-row">
      <div className="impact-row-main">
        <span className={`artifact-icon ${impact.classification}`}>
          <FileText size={18} />
        </span>
        <button onClick={onOpen}>
          <strong>{impact.artifact.title}</strong>
          <small>
            {impact.owner?.title} · {impact.path.relations.length} graph hops
          </small>
        </button>
        <Badge value={impact.classification} />
      </div>
      <p>{impact.reason}</p>
      <div className="impact-row-bottom">
        <button className="text-link" onClick={onOpen}>
          See evidence <ArrowUpRight size={13} />
        </button>
        {impact.reviewId ? (
          <button className="text-link" onClick={onReview}>
            Review{" "}
            {impact.classification === "conflict" ? "correction" : "dependency"}{" "}
            <ArrowRight size={13} />
          </button>
        ) : (
          <span className="preserved">
            <ShieldCheck size={13} />
            Preserved
          </span>
        )}
      </div>
    </article>
  );
}
function Evidence({
  ids,
  graph,
  onSelect,
}: {
  ids: string[];
  graph: Workspace["graph"];
  onSelect: (id: string) => void;
}) {
  return (
    <div className="evidence-path">
      {ids.map((id, i) => (
        <span key={id}>
          {i ? <ArrowRight size={13} /> : null}
          <button onClick={() => onSelect(id)}>
            {graph.nodes.find((n) => n.id === id)?.title || id}
          </button>
        </span>
      ))}
    </div>
  );
}
function Trace({ steps }: { steps: Analysis["trace"] }) {
  return (
    <details className="trace">
      <summary>
        <Activity size={14} />
        Inspect execution trace <ChevronDown size={14} />
      </summary>
      {steps.map((step, i) => (
        <div key={i}>
          <span className="trace-number">0{i + 1}</span>
          <span>
            <code>{step.tool}</code>
            <small>{step.detail}</small>
          </span>
          <b>
            {step.count} result{step.count !== 1 ? "s" : ""}
          </b>
        </div>
      ))}
    </details>
  );
}
