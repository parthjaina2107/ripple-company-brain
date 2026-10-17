import { request } from "node:https";
import { lookup } from "node:dns/promises";
import ipaddr from "ipaddr.js";
import { load } from "cheerio";
import type { ResearchPage } from "../shared/types.js";
import { DomainError } from "./domain.js";

export function publicWebsite(input: string): URL {
  let url: URL;
  try { url = new URL(input); } catch { throw new DomainError("Enter a full HTTPS website URL.", 400); }
  const host = url.hostname.toLowerCase();
  if ([...url.searchParams.keys()].some((key) => /token|password|secret|signature|api.?key|authorization/i.test(key)))
    throw new DomainError("Use a public policy URL without access tokens or credentials.", 400);
  if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443") || !host.includes(".") || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal") || ipaddr.isValid(host.replace(/^\[|\]$/g, "")))
    throw new DomainError("Use a public HTTPS company website with no credentials or custom port.", 400);
  url.hash = "";
  return url;
}
export function publicAddress(address: string) {
  try { return ipaddr.process(address).range() === "unicast"; } catch { return false; }
}
export function sameWebsite(url: URL, website: URL) {
  return url.protocol === "https:" && url.hostname.toLowerCase().replace(/^www\./, "") === website.hostname.toLowerCase().replace(/^www\./, "") && (!url.port || url.port === "443") && !url.username && !url.password;
}

async function download(url: URL, website: URL, redirects = 0, signal?: AbortSignal): Promise<{ url: URL; html: string }> {
  if (!sameWebsite(url, website) || redirects > 3) throw new DomainError("The page redirects outside the selected company website.", 400);
  const response = await new Promise<{ status: number; location?: string; type: string; body: string }>((resolve, reject) => {
    const req = request(url, {
      signal,
      headers: { "User-Agent": "RipplePolicyResearch/0.1", Accept: "text/html,text/plain" },
      // Pin the connection to a validated DNS answer; never resolve again after validation.
      lookup: (hostname, options, callback) => {
        void lookup(hostname, { all: true, verbatim: true }).then((addresses) => {
          if (!addresses.length || addresses.some((item) => !publicAddress(item.address))) return callback(new Error("Non-public network address blocked."), "", 4);
          if (options.all) callback(null, addresses);
          else callback(null, addresses[0].address, addresses[0].family);
        }).catch((error: Error) => callback(error, "", 4));
      },
    }, (res) => {
      const chunks: Buffer[] = []; let size = 0;
      res.on("data", (chunk: Buffer) => {
        size += chunk.length;
        if (size > 512 * 1024) { req.destroy(new Error("Page exceeds the research size limit.")); return; }
        chunks.push(chunk);
      });
      res.on("error", reject);
      res.on("end", () => resolve({ status: res.statusCode || 0, location: res.headers.location, type: res.headers["content-type"] || "", body: Buffer.concat(chunks).toString("utf8") }));
    });
    const deadline = setTimeout(() => req.destroy(new Error("Public page request timed out.")), 10000);
    req.on("error", reject); req.on("close", () => clearTimeout(deadline)); req.end();
  });
  if ([301, 302, 303, 307, 308].includes(response.status) && response.location)
    return download(new URL(response.location, url), website, redirects + 1, signal);
  if (response.status < 200 || response.status >= 300) throw new DomainError(`The public page returned HTTP ${response.status}. Choose an accessible policy page.`, 422);
  if (!/text\/(html|plain)/i.test(response.type)) throw new DomainError("Research currently reads HTML or plain-text policy pages.", 422);
  return { url, html: response.body };
}

export function parsePublicPage(url: URL, html: string): { page: ResearchPage; links: string[] } {
  const $ = load(html);
  const links = $("a[href]").toArray().flatMap((element) => {
    const href = $(element).attr("href") || "";
    if (!/refund|return|cancel|trial|terms|support|sla|polic/i.test(`${href} ${$(element).text()}`)) return [];
    try { const link = new URL(href, url); link.hash = ""; return sameWebsite(link, url) ? [link.href] : []; } catch { return []; }
  });
  $("script,style,noscript,svg,nav,header,footer,form,[hidden],[aria-hidden=true]").remove();
  $("br,p,li,h1,h2,h3,h4,section,article,div").append("\n");
  const text = $("main").length ? $("main").text() : $("body").text();
  return { page: { url: url.href, title: $("title").text().trim().slice(0, 160) || url.hostname, text: text.replace(/[\t ]+/g, " ").replace(/\n\s*\n/g, "\n").trim().slice(0, 12000), retrievedAt: new Date().toISOString() }, links: [...new Set(links)] };
}

export async function researchPages(input: string, fetchPage = download, signal: AbortSignal = AbortSignal.timeout(40000)) {
  const website = publicWebsite(input);
  let first: { url: URL; html: string };
  try { first = await fetchPage(website, website, 0, signal); }
  catch (error) {
    if (error instanceof DomainError) throw error;
    throw new DomainError("The public website could not be read. It may block automated access or be temporarily unavailable. Try a direct public policy page.", 422);
  }
  const parsed = parsePublicPage(first.url, first.html);
  const pages = [parsed.page]; const warnings: string[] = [];
  for (const href of parsed.links.filter((link) => link !== first.url.href).slice(0, 3)) {
    try {
      signal.throwIfAborted();
      const fetched = await fetchPage(publicWebsite(href), website, 0, signal);
      if (!pages.some((page) => page.url === fetched.url.href)) pages.push(parsePublicPage(fetched.url, fetched.html).page);
    } catch { warnings.push(`A linked policy page could not be read: ${new URL(href).pathname}`); }
  }
  signal.throwIfAborted();
  return { website: website.href, pages, warnings };
}
