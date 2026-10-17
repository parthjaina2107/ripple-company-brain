import { useEffect, useState } from "react";
import { ArrowRight, Building2, Globe, LoaderCircle, ShieldCheck, Waves } from "lucide-react";
import type { CompanyProfile } from "../shared/types";
import { authClient } from "./auth-client";
import { setDemoMode, setCompanyContext } from "./api";
import App from "./App";

type Session = { user: { id: string; email: string } | null; companies: CompanyProfile[]; activeCompany: CompanyProfile | null };
export default function AuthGate() {
  const [session, setSession] = useState<Session>();
  const [demo, setDemo] = useState(false);
  const [view, setView] = useState<"signin" | "signup" | "companies">("signin");
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState(""); const [website, setWebsite] = useState("");
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function refresh() {
    const response = await fetch("/api/session", { signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error("Unable to check your session. Check that the API is running.");
    const next: Session = await response.json(); setCompanyContext(next.activeCompany?.id); setSession(next); return next;
  }
  useEffect(() => { let active = true; void fetch("/api/session", { signal: AbortSignal.timeout(15000) }).then(async (response) => { if (!response.ok) throw new Error("Session service is unavailable. Retry in a moment."); return response.json() as Promise<Session>; }).then((next) => { if (active) { setCompanyContext(next.activeCompany?.id); setSession(next); } }).catch((err: Error) => { if (active) { setError(err.message); setSession({ user: null, companies: [], activeCompany: null }); } }); return () => { active = false; }; }, []);
  async function execute(work: () => Promise<void>) {
    if (busy) return; setBusy(true); setError("");
    try { await work(); } catch (err) { setError(err instanceof Error ? err.message : "The operation failed. Try again."); } finally { setBusy(false); }
  }
  async function signOut() {
    const result = await authClient.signOut();
    if (result.error) { setView("companies"); throw new Error(result.error.message); }
    setPassword(""); setDemo(false); setDemoMode(false); setView("signin"); await refresh();
  }
  if (!session) return <div className="auth-loading"><LoaderCircle className="spin" />Checking your workspace session…</div>;
  if (demo) return <App key="public-demo" company={{ id: "demo", name: "Acme", website: "", demo: true }} onAccount={() => { setDemo(false); setDemoMode(false); }} />;
  if (session.user && session.activeCompany && view !== "companies") return <App key={session.activeCompany.id} company={session.activeCompany} onAccount={() => setView("companies")} onSignOut={() => void execute(signOut)} />;
  const creatingCompany = !!session.user;
  return <div className="auth-shell">
    <section className="auth-story">
      <a className="brand" href="/"><span className="brand-mark"><Waves size={25} /></span>ripple.</a>
      <span className="eyebrow">COMPANY CONTEXT THAT STAYS CONNECTED</span>
      <h1>Your policies.<br />Your company brain.</h1>
      <p>Research the public sources you choose. Review what the agent finds. Trace every policy change to the knowledge it affects.</p>
      <div className="auth-benefits"><span><Building2 />Separate company workspaces</span><span><Globe />Public website research with sources</span><span><ShieldCheck />Owner approval before policies become authority</span></div>
      <button className="text-link" onClick={() => { setDemoMode(true); setDemo(true); }}>Explore the read-only Acme demo <ArrowRight size={15} /></button>
    </section>
    <section className="auth-card">
      <span className="eyebrow">{creatingCompany ? "YOUR COMPANY WORKSPACES" : "WELCOME TO RIPPLE"}</span>
      <h2>{creatingCompany ? "Choose your company." : view === "signup" ? "Create your account." : "Sign in to your workspace."}</h2>
      <p>{creatingCompany ? "Select an existing workspace or create an empty company workspace and add its official website." : "Company data is available only to members of that workspace."}</p>
      {error ? <div role="alert" className="notice">{error}</div> : null}
      {creatingCompany ? <>
        {session.companies.map((company) => <button className="company-option" key={company.id} disabled={busy} onClick={() => void execute(async () => { const result = await authClient.organization.setActive({ organizationId: company.id }); if (result.error) throw new Error(result.error.message); await refresh(); setView("signin"); })}><Building2 size={19} /><span><strong>{company.name}</strong><small>{company.website || "Company workspace"}</small></span><ArrowRight size={17} /></button>)}
        <form onSubmit={(event) => { event.preventDefault(); void execute(async () => {
          const parsed = new URL(website); if (parsed.protocol !== "https:") throw new Error("Use the company's HTTPS website URL.");
          const slug = `${companyName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 45) || "company"}-${crypto.randomUUID().slice(0, 8)}`;
          const result = await authClient.organization.create({ name: companyName.trim(), slug, metadata: { website: parsed.href } });
          if (result.error) throw new Error(result.error.message);
          if (result.data) { const active = await authClient.organization.setActive({ organizationId: result.data.id }); if (active.error) throw new Error(active.error.message); }
          await refresh(); setView("signin"); setCompanyName(""); setWebsite("");
        }); }}>
          <label>Company name<input required minLength={2} maxLength={100} value={companyName} onChange={(e) => setCompanyName(e.target.value)} autoComplete="organization" disabled={busy} /></label>
          <label>Official website<input type="url" required placeholder="https://your-company.com" maxLength={2000} value={website} onChange={(e) => setWebsite(e.target.value)} disabled={busy} /></label>
          <button className="primary full" disabled={busy}>{busy ? <LoaderCircle className="spin" size={17} /> : <Building2 size={17} />}Create company workspace</button>
        </form>
        <p className="form-help">New workspaces start empty. Adding a website does not approve its policies or give access to another company's workspace.</p>
        <button className="text-link" disabled={busy} onClick={() => void execute(signOut)}>Sign out</button>
      </> : <>
        <div className="auth-tabs"><button className={view === "signin" ? "selected" : ""} onClick={() => { setView("signin"); setError(""); }}>Sign in</button><button className={view === "signup" ? "selected" : ""} onClick={() => { setView("signup"); setError(""); }}>Create account</button></div>
        <form onSubmit={(event) => { event.preventDefault(); void execute(async () => {
          const result = view === "signup" ? await authClient.signUp.email({ email, password, name: "Workspace owner" }) : await authClient.signIn.email({ email, password });
          if (result.error) throw new Error(result.error.message || "Unable to sign in.");
          setPassword(""); await refresh(); setView("signin");
        }); }}>
          <label>Work email<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" disabled={busy} /></label>
          <label>Password<input type="password" required minLength={view === "signup" ? 12 : undefined} maxLength={128} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={view === "signup" ? "new-password" : "current-password"} disabled={busy} /></label>
          {view === "signup" ? <small>Use at least 12 characters. Email delivery and account recovery are not configured for this local prototype.</small> : null}
          <button className="primary full" disabled={busy}>{busy ? <LoaderCircle className="spin" size={17} /> : null}{view === "signup" ? "Create account" : "Sign in"}<ArrowRight size={17} /></button>
        </form>
      </>}
    </section>
  </div>;
}
