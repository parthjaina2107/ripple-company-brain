import type { CompanyProfile } from "./types.js";
export function workspaceDate(company: CompanyProfile) {
  return company.demo || company.sandbox ? "2026-10-17" : new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}
