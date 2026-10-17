import type { IncomingMessage, ServerResponse } from "node:http";
import { cleanupExpiredSandboxes } from "../server/judge-sandbox.js";
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader("Cache-Control", "no-store");
  if (!process.env.CRON_SECRET || req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) { res.statusCode = 401; return res.end("Unauthorized"); }
  try { await cleanupExpiredSandboxes(); res.end("Expired sandbox cleanup complete"); }
  catch { res.statusCode = 503; res.end("Cleanup unavailable"); }
}
