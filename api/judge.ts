import type { IncomingMessage, ServerResponse } from "node:http";
import app from "../server/index.js";

// A single function handles every sandbox operation, preserving one serial
// service queue per visitor in each running instance and avoiding route limits.
export default function handler(req: IncomingMessage, res: ServerResponse) {
  const path = new URL(req.url || "/", "https://ripple.invalid").searchParams.get("path");
  if (!path || !/^\/[a-zA-Z0-9/:_%.-]+$/.test(path) || path.includes("..")) {
    res.statusCode = 400;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Invalid sandbox operation." }));
    return;
  }
  req.url = `/api/judge${path}`;
  return app(req, res);
}
