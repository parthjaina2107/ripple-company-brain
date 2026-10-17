import { betterAuth, type BetterAuthOptions } from "better-auth";
import { organization } from "better-auth/plugins/organization";
import { getMigrations } from "better-auth/db/migration";
import { DatabaseSync } from "node:sqlite";
import { randomBytes } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { CompanyProfile } from "../shared/types.js";

function localSecret() {
  if (process.env.BETTER_AUTH_SECRET) return process.env.BETTER_AUTH_SECRET;
  if (process.env.NODE_ENV === "production") throw new Error("Set BETTER_AUTH_SECRET for production authentication.");
  const file = resolve(".data/auth-secret");
  mkdirSync(dirname(file), { recursive: true });
  try { return readFileSync(file, "utf8").trim(); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    const secret = randomBytes(32).toString("base64url");
    writeFileSync(file, secret, { flag: "wx", mode: 0o600 });
    return secret;
  }
}

export async function createAuth(options: { file?: string; secret?: string; baseURL?: string } = {}) {
  const file = options.file || resolve(".data/auth.sqlite");
  if (file !== ":memory:") mkdirSync(dirname(file), { recursive: true });
  const database = new DatabaseSync(file);
  database.exec("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;");
  const authOptions = {
    database,
    secret: options.secret || localSecret(),
    baseURL: options.baseURL || process.env.BETTER_AUTH_URL || process.env.APP_ORIGIN || "http://127.0.0.1:5173",
    trustedOrigins: [process.env.APP_ORIGIN, process.env.BETTER_AUTH_URL, "http://127.0.0.1:5173", "http://localhost:5173", "http://127.0.0.1:3001", "http://localhost:3001"].filter((value): value is string => !!value),
    emailAndPassword: { enabled: true, minPasswordLength: 12, maxPasswordLength: 128 },
    rateLimit: { enabled: true, storage: "database", window: 60, max: 60,
      customRules: { "/sign-in/email": { window: 60, max: 5 }, "/sign-up/email": { window: 60, max: 3 } } },
    plugins: [organization({ organizationLimit: 5, requireEmailVerificationOnInvitation: true })],
  } satisfies BetterAuthOptions;
  const migrations = await getMigrations(authOptions);
  await migrations.runMigrations();
  const auth = betterAuth(authOptions);
  return { auth, close: () => database.close() };
}

export function companyProfile(org: { id: string; name: string; metadata?: unknown }): CompanyProfile {
  let metadata: Record<string, unknown> = {};
  try { metadata = typeof org.metadata === "string" ? JSON.parse(org.metadata) : (org.metadata || {}) as Record<string, unknown>; } catch { /* Missing optional metadata is not a policy source. */ }
  return { id: org.id, name: org.name, website: typeof metadata.website === "string" ? metadata.website : "" };
}
