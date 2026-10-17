import { randomUUID, createHash } from "node:crypto";
import type {
  DecisionInput,
  Extraction,
  GraphState,
  Scope,
  ResearchResult,
} from "../shared/types.js";
import type { Repository } from "./repository.js";
import {
  addDecision,
  analyze,
  applyCorrection,
  createReviews,
  DomainError,
  reconcileReviews,
} from "./domain.js";
import { answerQuestion, discoverPublicFindings } from "./ai.js";
import { researchPages } from "./public-web.js";
import { applicablePolicy } from "./domain.js";
import { edge } from "./seed.js";
import { modelLabel } from "./model-config.js";
import { correctionExport } from "./correction-export.js";
import { policies, topicOf, validClaimQuote } from "../shared/policies.js";

export class RippleService {
  private researchRunning = false;
  private tail: Promise<unknown> = Promise.resolve();
  constructor(public repo: Repository) {}
  exportCorrection(reviewId: string, company: import("../shared/types.js").CompanyProfile) {
    return this.serial(async () => correctionExport(await this.repo.read(), reviewId, company));
  }
  // Serialize reads and writes in this single-process hackathon server to prevent lost updates.
  serial<T>(work: () => Promise<T>): Promise<T> {
    const result = this.tail.then(work);
    this.tail = result.catch(() => undefined);
    return result;
  }
  workspace() {
    return this.serial(async () => ({
      graph: await this.repo.read(),
      health: {
        storage: this.repo.mode,
        connected: true,
        model: modelLabel(),
        graphName:
          this.repo.mode === "preview"
            ? "Local development simulator"
            : this.repo.graphName || process.env.FALKORDB_GRAPH || "ripple_hackathon",
      },
    }));
  }
  async analyzeState(state: GraphState, decisionId: string, asOf: string) {
    const decision = state.nodes.find(
      (n) => n.id === decisionId && n.kind === "decision",
    );
    if (!decision) throw new DomainError("Decision not found.", 404);
    const paths = await this.repo.paths(policies[topicOf(decision)].root);
    const analysis = analyze(state, decision, paths, asOf);
    createReviews(state, analysis);
    return analysis;
  }
  decide(input: DecisionInput) {
    return this.serial(async () => {
      const state = await this.repo.read();
      const decision = addDecision(state, input);
      // The new version is saved after analysis. Existing dependency paths are queried in FalkorDB.
      const analysis = await this.analyzeState(state, decision.id, input.asOf);
      await this.repo.save(state);
      return analysis;
    });
  }
  reanalyze(decisionId: string, asOf: string) {
    return this.serial(async () => {
      const state = await this.repo.read();
      const analysis = await this.analyzeState(state, decisionId, asOf);
      // Refresh stale pending reviews without losing already applied/dismissed records.
      for (const impact of analysis.impacts) {
        const review = state.nodes.find((n) => n.id === impact.reviewId);
        if (
          review?.status === "pending" &&
          review.sourceRevision !== impact.artifact.revision
        ) {
          review.status = "stale";
        }
      }
      await this.repo.save(state);
      return analysis;
    });
  }
  apply(reviewId: string, asOf: string) {
    return this.serial(async () => {
      const state = await this.repo.read();
      const review = applyCorrection(state, reviewId, asOf);
      reconcileReviews(state, asOf);
      await this.repo.save(state);
      return review;
    });
  }
  resolve(reviewId: string, note: string) {
    return this.serial(async () => {
      const state = await this.repo.read();
      const review = state.nodes.find(
        (n) => n.id === reviewId && n.kind === "review",
      );
      if (!review) throw new DomainError("Review not found.", 404);
      if (review.status !== "pending")
        throw new DomainError("Only pending reviews can be resolved.");
      review.status = "reviewed";
      state.nodes.push({
        id: `correction-${randomUUID()}`,
        kind: "correction",
        title: `Reviewed ${review.title}`,
        artifactId: review.artifactId,
        decisionId: review.decisionId,
        content: note,
        createdAt: new Date().toISOString(),
        status: "reviewed",
      });
      await this.repo.save(state);
      return review;
    });
  }
  ingest(extraction: Extraction, ownerId: string) {
    return this.serial(async () => {
      const state = await this.repo.read();
      if (!state.nodes.some((n) => n.id === ownerId && n.kind === "owner"))
        throw new DomainError("Choose an existing owner.", 400);
      for (const c of extraction.claims) {
        if (
          !validClaimQuote(c, extraction.content)
        )
          throw new DomainError(
            "Every claim must quote an explicit supported policy value, unit, and customer audience from the document.",
            400,
          );
      }
      const scopes = [...new Set(extraction.claims.map((c) => c.scope))];
      const id = `doc-${randomUUID()}`;
      state.nodes.push({
        id,
        kind: "document",
        title: extraction.title,
        content: extraction.content,
        scope: scopes.length === 1 ? scopes[0] : "all",
        ownerId,
        status: "current",
        revision: 1,
        createdAt: new Date().toISOString(),
        extractionMethod: extraction.method,
      });
      state.edges.push(edge(id, ownerId, "OWNED_BY"));
      for (const c of extraction.claims) {
        const claimId = `claim-${randomUUID()}`;
        state.nodes.push({
          id: claimId,
          kind: "claim",
          title: `${policies[topicOf(c)].label}: ${c.value} ${policies[topicOf(c)].unit}`,
          topic: topicOf(c),
          value: c.value,
          scope: c.scope,
          quote: c.quote,
          sourceId: id,
          status: "current",
          extractionMethod: extraction.method,
        });
        state.edges.push(
          edge(id, claimId, "ASSERTS"),
          edge(claimId, policies[topicOf(c)].root, "DEPENDS_ON"),
        );
      }
      await this.repo.save(state);
      return { id };
    });
  }
  ask(question: string, scope: Scope, asOf: string) {
    return this.serial(async () =>
      answerQuestion(await this.repo.read(), question, scope, asOf),
    );
  }

  async researchWebsite(website: string) {
    if (this.researchRunning) throw new DomainError("Website research is already running for this workspace.", 409);
    this.researchRunning = true;
    try {
      const source = await researchPages(website);
      const findings = await discoverPublicFindings(source.pages);
      const result: ResearchResult = { id: `research-${randomUUID()}`, ...source, findings, createdAt: new Date().toISOString() };
      if (!findings.length) result.warnings.push("No supported numeric policies were found. Try a direct public policy URL. Nothing was inferred or approved.");
      await this.serial(async () => {
        const state = await this.repo.read();
        state.nodes.push({ id: result.id, kind: "research", title: `Public policy research · ${new URL(website).hostname}`, sourceUrl: result.website, content: JSON.stringify(result), createdAt: result.createdAt, status: "pending" });
        await this.repo.save(state);
      });
      return result;
    } finally { this.researchRunning = false; }
  }

  researchHistory() {
    return this.serial(async () => (await this.repo.read()).nodes.filter((n) => n.kind === "research")
      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")).slice(0, 10)
      .map((n) => ({ ...JSON.parse(n.content!) as ResearchResult, approved: n.status === "approved" })));
  }

  approveResearch(researchId: string, selections: Array<{ findingId: string; scope: Scope }>, effectiveFrom: string) {
    return this.serial(async () => {
      const state = await this.repo.read();
      const record = state.nodes.find((n) => n.id === researchId && n.kind === "research");
      if (!record) throw new DomainError("Research snapshot not found in this company workspace.", 404);
      if (record.status === "approved") throw new DomainError("This research snapshot has already been imported.");
      const result: ResearchResult = JSON.parse(record.content!);
      if (Date.now() - Date.parse(result.createdAt) > 24 * 60 * 60 * 1000) throw new DomainError("This snapshot is over 24 hours old. Research the website again before approval.");
      if (!selections.length || new Set(selections.map((s) => s.findingId)).size !== selections.length) throw new DomainError("Select distinct findings to approve.", 400);
      const selected = selections.map((selection) => {
        const finding = result.findings.find((f) => f.id === selection.findingId);
        const page = finding && result.pages.find((p) => p.url === finding.sourceUrl);
        if (!finding || !page?.text.includes(finding.quote)) throw new DomainError("A selected finding has no matching stored source quote.", 400);
        return { ...finding, scope: selection.scope };
      });
      const policyValues = new Map<string, number>();
      for (const finding of selected) {
        const key = `${finding.topic}:${finding.scope}`;
        if (policyValues.has(key) && policyValues.get(key) !== finding.value) throw new DomainError("The selected sources disagree for the same policy and audience. Choose one value or assign the correct audience.", 400);
        policyValues.set(key, finding.value);
      }
      const policyIds = new Map<string, string>(); let policiesCreated = 0;
      for (const finding of selected) {
        const key = `${finding.topic}:${finding.scope}`;
        if (policyIds.has(key)) continue;
        let policy = applicablePolicy(state, finding.scope, effectiveFrom, finding.topic);
        if (!policy || policy.value !== finding.value) {
          const decision = addDecision(state, { topic: finding.topic, title: `Confirm ${policies[finding.topic].label.toLowerCase()} at ${finding.value} ${policies[finding.topic].unit}`, value: finding.value, scope: finding.scope, status: "approved", effectiveFrom, asOf: effectiveFrom });
          policy = state.nodes.find((n) => n.id === decision.policyId)!;
          policy.sourceUrl = finding.sourceUrl;
          policy.quote = finding.quote;
          policiesCreated++;
        }
        policyIds.set(key, policy.id);
      }
      let documentsCreated = 0;
      for (const page of result.pages) {
        const pageFindings = selected.filter((f) => f.sourceUrl === page.url);
        if (!pageFindings.length) continue;
        const baseSourceId = `doc-web-${createHash("sha256").update(`${page.url}\n${page.text}`).digest("hex").slice(0, 24)}`;
        const scopes = new Set(pageFindings.map((f) => f.scope));
        let source = state.nodes.find((node) => node.kind === "document" && node.sourceUrl === page.url && node.content === page.text && node.status === "current");
        const sourceId = source?.id || (state.nodes.some((node) => node.id === baseSourceId) ? `doc-web-${randomUUID()}` : baseSourceId);
        const created = !source;
        let sourceChanged = false;
        if (!source) {
          for (const old of state.nodes.filter((node) => node.kind === "document" && node.sourceUrl === page.url && node.status === "current")) old.status = "superseded";
          source = { id: sourceId, kind: "document", title: page.title, content: page.text, sourceUrl: page.url, sourceSystem: "Company website · owner reviewed", retrievedAt: page.retrievedAt, ownerId: "owner-company", scope: scopes.size === 1 ? pageFindings[0].scope : "all", status: "current", revision: 1, createdAt: new Date().toISOString() };
          state.nodes.push(source);
          state.edges.push(edge(sourceId, "owner-company", "OWNED_BY"));
          documentsCreated++;
        } else {
          source.status = "current";
          if (source.scope !== pageFindings[0].scope || scopes.size > 1) source.scope = "all";
        }
        for (const finding of pageFindings) {
          if (state.nodes.some((node) => node.kind === "claim" && node.status === "current" && node.sourceId === sourceId && node.topic === finding.topic && node.scope === finding.scope && node.quote === finding.quote && node.value === finding.value)) continue;
          if (!created && !sourceChanged) { source.revision = (source.revision || 1) + 1; sourceChanged = true; }
          const claimId = `claim-${randomUUID()}`;
          state.nodes.push({ id: claimId, kind: "claim", topic: finding.topic, title: `${policies[finding.topic].label}: ${finding.value} ${policies[finding.topic].unit}`, value: finding.value, scope: finding.scope, quote: finding.quote, sourceId, sourceUrl: page.url, status: "current", extractionMethod: "Website research · owner approved" });
          state.edges.push(edge(sourceId, claimId, "ASSERTS"), edge(claimId, policyIds.get(`${finding.topic}:${finding.scope}`)!, "DEPENDS_ON"));
        }
      }
      record.status = "approved";
      reconcileReviews(state, effectiveFrom);
      await this.repo.save(state);
      return { documentsCreated, policiesCreated };
    });
  }
}
