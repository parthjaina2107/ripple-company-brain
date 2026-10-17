import "dotenv/config";
import express from "express";
import { resolve } from "node:path";
import { existsSync } from "node:fs";
import { z } from "zod";
import { createRepository } from "./repository.js";
import { RippleService } from "./service.js";
import { DomainError } from "./domain.js";
import { extractClaims } from "./ai.js";
import { ModelError } from "./model-config.js";
import { policyTopics } from "../shared/policies.js";

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
app.disable("x-powered-by");
app.use(express.json({ limit: "100kb" }));
// Local single-workspace application. Reject cross-origin mutations; bind to loopback by default.
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowed = process.env.APP_ORIGIN;
  if (
    origin &&
    ![
      allowed,
      "http://127.0.0.1:5173",
      "http://localhost:5173",
      `http://127.0.0.1:${process.env.PORT || 3001}`,
      `http://localhost:${process.env.PORT || 3001}`,
    ].includes(origin)
  )
    return res.status(403).json({ error: "Origin not allowed." });
  next();
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
app.use("/api", (_req, _res, next) => {
  if (!service) throw new DomainError(startupError || "Server not ready.", 503);
  if (service.repo.isReady?.() === false)
    throw new DomainError(
      "The database connection is recovering. Retry in a moment; your saved data has not been replaced.",
      503,
    );
  next();
});
app.get("/api/workspace", async (_req, res) =>
  res.json(await service!.workspace()),
);
app.post("/api/decisions", async (req, res) =>
  res.status(201).json(await service!.decide(decisionSchema.parse(req.body))),
);
app.post("/api/decisions/:id/analyze", async (req, res) =>
  res.json(
    await service!.reanalyze(
      req.params.id,
      z.object({ asOf: date }).parse(req.body).asOf,
    ),
  ),
);
app.post("/api/reviews/:id/apply", async (req, res) =>
  res.json(
    await service!.apply(
      req.params.id,
      z.object({ asOf: date }).parse(req.body).asOf,
    ),
  ),
);
app.post("/api/reviews/:id/resolve", async (req, res) =>
  res.json(
    await service!.resolve(
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
  res.status(201).json(await service!.ingest(data, data.ownerId));
});
app.post("/api/ask", async (req, res) => {
  const data = z
    .object({ question: z.string().trim().min(3).max(2000), scope, asOf: date })
    .parse(req.body);
  res.json(await service!.ask(data.question, data.scope, data.asOf));
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
const port = Number(process.env.PORT || 3001);
app.listen(port, process.env.HOST || "127.0.0.1", () =>
  console.log(
    `Ripple API: http://127.0.0.1:${port} · ${service?.repo.mode || "disconnected"}`,
  ),
);
