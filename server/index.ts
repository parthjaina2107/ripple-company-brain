import "dotenv/config";
import express from "express";
import { resolve } from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { createRepository } from "./repository.js";
import { RippleService } from "./service.js";
import { DomainError } from "./domain.js";
import { extractClaims } from "./ai.js";
import { ModelError } from "./model-config.js";
import { policyTopics } from "../shared/policies.js";
import { toNodeHandler, fromNodeHeaders } from "better-auth/node";
import { createAuth, companyProfile } from "./auth.js";
import { CompanyWorkspaces } from "./company-workspaces.js";
import { graphFromCookie, sandboxCompany, sandboxCookie, sandboxLifetime, sandboxOperationAllowed, sandboxService, startSandbox } from "./judge-sandbox.js";

const date = z.iso.date();
const scope = z.enum(["new", "enterprise", "all"]);
const decisionSchema = z.object({
  topic: z.enum(policyTopics).default("trial_duration"),
  title: z.string().trim().min(3).max(160),
  value: z.number().int().min(1).max(365),
  scope,
  effectiveFrom: date,
  status: z.enum(["approved", "proposed"]),
  asOf: date,
});
const documentSchema = z.object({
  title: z.string().trim().min(3).max(160),
  content: z.string().trim().min(10).max(20000),
});
const app = express();
// The hosted showcase exposes only the seeded Acme graph. It avoids creating a
// local SQLite auth database on serverless storage and protects shared demo data.
const shareDemo = process.env.RIPPLE_SHARE_DEMO === "true";
app.disable("x-powered-by");
// The API and session cookies share the frontend origin through the Vite proxy.
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowed = process.env.APP_ORIGIN;
  if (
    origin &&
    ![
      allowed,
      "https://ripple-company-brain.vercel.app",
      "http://127.0.0.1:5173",
      "http://localhost:5173",
      `http://127.0.0.1:${process.env.PORT || 3001}`,
      `http://localhost:${process.env.PORT || 3001}`,
    ].includes(origin)
  )
    return res.status(403).json({ error: "Origin not allowed." });
  next();
});
const auth = shareDemo ? undefined : (await createAuth()).auth;
const companyWorkspaces = new CompanyWorkspaces();
if (auth) app.all("/api/auth/*splat", toNodeHandler(auth));
app.use(express.json({ limit: "100kb" }));
app.post("/api/judge/session", async (req, res) => {
  const { token } = await startSandbox(req.headers.cookie);
  res.setHeader("Cache-Control", "no-store");
  res.cookie(sandboxCookie, token, { httpOnly: true, secure: !!process.env.VERCEL, sameSite: "strict", path: "/api/judge", maxAge: sandboxLifetime });
  res.json({ company: sandboxCompany });
});
app.get("/api/session", async (req, res) => {
  if (shareDemo)
    return res.json({ user: null, companies: [], activeCompany: null, shareDemo: true });
  const headers = fromNodeHeaders(req.headers);
  const session = await auth!.api.getSession({ headers });
  if (!session) return res.json({ user: null, companies: [], activeCompany: null });
  const companies = (await auth!.api.listOrganizations({ headers })).map(companyProfile);
  res.json({ user: { id: session.user.id, email: session.user.email }, companies,
    activeCompany: companies.find((company) => company.id === session.session.activeOrganizationId) || null });
});

let service: RippleService | undefined;
let startupError: string | undefined;
async function connectWorkspace() {
  try {
    const repo = await createRepository();
    await repo.read();
    service = new RippleService(repo);
    startupError = undefined;
  } catch (error) {
    startupError = /\bOOM\b|maxmemory/i.test(error instanceof Error ? error.message : "")
      ? "FalkorDB has reached its memory capacity. Saved graph data is retained; new writes need available database memory."
      : "FalkorDB connection is unavailable. Check the database configuration or retry shortly; the server will reconnect automatically.";
    console.error(startupError);
    setTimeout(() => void connectWorkspace(), 10000).unref();
  }
}
await connectWorkspace();

app.get("/api/health", (_req, res) =>
  res.status(service && (service.repo.isReady?.() ?? true) ? 200 : 503).json({
    ready: !!service && (service.repo.isReady?.() ?? true),
    storage: process.env.RIPPLE_MODE || "preview",
    error: startupError,
  }),
);
app.use("/api", async (req, res, next) => {
  if (req.path.startsWith("/judge/")) {
    const path = req.path.replace(/^\/judge/, "");
    if (!sandboxOperationAllowed(req.method, path)) throw new DomainError("Unsupported sandbox operation.", 403);
    const graph = graphFromCookie(req.headers.cookie);
    const judgeService = await sandboxService(graph);
    if (req.method === "POST" && ["/decisions", "/documents", "/research"].includes(path) && (await judgeService.repo.read()).nodes.length >= 400)
      throw new DomainError("This sandbox has reached its demo size limit. You can still inspect and correct existing records.", 413);
    res.setHeader("Cache-Control", "no-store");
    res.locals.companyService = judgeService;
    res.locals.company = sandboxCompany;
    req.url = path;
  } else if (req.path.startsWith("/demo/")) {
    if (!(req.method === "GET" && (req.path === "/demo/workspace" || /^\/demo\/reviews\/[^/]+\/export$/.test(req.path))) && !(req.method === "POST" && req.path === "/demo/ask"))
      throw new DomainError("The public Acme demo is read-only. Sign in to manage a company workspace.", 403);
    if (!service) throw new DomainError(startupError || "Demo database is not ready.", 503);
    res.locals.companyService = service;
    res.locals.company = { id: "demo", name: "Acme", website: "", demo: true };
    req.url = req.url.replace(/^\/demo/, "");
  } else {
    if (shareDemo)
      throw new DomainError("This hosted showcase is read-only. Open the Acme demo to explore the graph.", 403);
    const headers = fromNodeHeaders(req.headers);
    const session = await auth!.api.getSession({ headers });
    if (!session) throw new DomainError("Sign in to access company policies.", 401);
    if (!session.session.activeOrganizationId) throw new DomainError("Create or select a company workspace first.", 409);
    if (req.get("X-Ripple-Company") !== session.session.activeOrganizationId)
      throw new DomainError("The active company changed in another tab. Reload and confirm the company before continuing.", 409);
    const member = await auth!.api.getActiveMember({ headers });
    if (!member || member.organizationId !== session.session.activeOrganizationId) throw new DomainError("You are not a member of this company workspace.", 403);
    if (req.method !== "GET" && req.path !== "/ask" && !member.role.split(",").some((role) => ["owner", "admin"].includes(role)))
      throw new DomainError("Only company owners and administrators can approve policies or modify knowledge.", 403);
    const org = await auth!.api.getOrganization({ headers, query: { organizationId: session.session.activeOrganizationId } });
    if (!org) throw new DomainError("Company workspace not found.", 404);
    const company = companyProfile(org);
    res.locals.companyService = await companyWorkspaces.get(company);
    res.locals.company = company;
  }
  if ((res.locals.companyService as RippleService).repo.isReady?.() === false)
    throw new DomainError(
      "The database connection is recovering. Retry in a moment; your saved data has not been replaced.",
      503,
    );
  next();
});
const currentService = (res: express.Response): RippleService => res.locals.companyService;
app.get("/api/reviews/:id/export", async (req, res) =>
  res.json(await currentService(res).exportCorrection(req.params.id, res.locals.company)),
);
app.get("/api/workspace", async (_req, res) =>
  res.json({ ...await currentService(res).workspace(), company: res.locals.company }),
);
app.post("/api/decisions", async (req, res) =>
  res.status(201).json(await currentService(res).decide(decisionSchema.parse(req.body))),
);
app.post("/api/decisions/:id/analyze", async (req, res) =>
  res.json(
    await currentService(res).reanalyze(
      req.params.id,
      z.object({ asOf: date }).parse(req.body).asOf,
    ),
  ),
);
app.post("/api/reviews/:id/apply", async (req, res) =>
  res.json(
    await currentService(res).apply(
      req.params.id,
      z.object({ asOf: date }).parse(req.body).asOf,
    ),
  ),
);
app.post("/api/reviews/:id/resolve", async (req, res) =>
  res.json(
    await currentService(res).resolve(
      req.params.id,
      z.object({ note: z.string().trim().min(5).max(1000) }).parse(req.body)
        .note,
    ),
  ),
);
app.post("/api/documents/extract", async (req, res) => {
  const { title, content } = documentSchema.parse(req.body);
  res.json(await extractClaims(title, content));
});
app.post("/api/documents", async (req, res) => {
  const data = documentSchema
    .extend({
      ownerId: z.string(),
      method: z.string().max(100),
      claims: z
        .array(
          z.object({
            topic: z.enum(policyTopics).default("trial_duration"),
            value: z.number().int().min(1).max(365),
            scope,
            quote: z.string().min(1).max(20000),
          }),
        )
        .max(10),
    })
    .parse(req.body);
  res.status(201).json(await currentService(res).ingest(data, data.ownerId));
});
app.post("/api/ask", async (req, res) => {
  const data = z
    .object({ question: z.string().trim().min(3).max(2000), scope, asOf: date })
    .parse(req.body);
  res.json(await currentService(res).ask(data.question, data.scope, data.asOf));
});
app.get("/api/research", async (_req, res) => res.json(await currentService(res).researchHistory()));
app.post("/api/research", async (req, res) => {
  const data = z.object({ website: z.string().url().max(2000) }).parse(req.body);
  res.status(201).json(await currentService(res).researchWebsite(data.website));
});
app.post("/api/research/:id/approve", async (req, res) => {
  const data = z.object({ effectiveFrom: date, selections: z.array(z.object({ findingId: z.string().min(1), scope })).min(1).max(16) }).parse(req.body);
  res.json(await currentService(res).approveResearch(req.params.id, data.selections, data.effectiveFrom));
});

if (existsSync(resolve("dist/index.html"))) {
  app.use(express.static(resolve("dist")));
  app.get("/{*path}", (req, res, next) =>
    req.path.startsWith("/api/")
      ? next()
      : res.sendFile(resolve("dist/index.html")),
  );
}
app.use("/api", (_req, res) =>
  res.status(404).json({ error: "Endpoint not found." }),
);
app.use(
  (
    error: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    if (error instanceof z.ZodError)
      return res.status(400).json({
        error: "Check the form fields.",
        details: error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
      });
    if (error instanceof DomainError || error instanceof ModelError)
      return res.status(error.status).json({ error: error.message });
    if (error instanceof SyntaxError)
      return res.status(400).json({ error: "Invalid JSON request." });
    console.error(
      "Request failed:",
      error instanceof Error ? error.name : "unknown",
    );
    res.status(503).json({
      error:
        "The operation could not complete. Check the database or model connection and retry. No correction was silently applied.",
    });
  },
);
const isDirectRun = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  const port = Number(process.env.PORT || 3001);
  app.listen(port, process.env.HOST || "127.0.0.1", () =>
    console.log(
      `Ripple API: http://127.0.0.1:${port} · ${service?.repo.mode || "disconnected"}`,
    ),
  );
}

export default app;
