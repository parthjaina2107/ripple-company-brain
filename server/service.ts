import { randomUUID } from "node:crypto";
import type {
  DecisionInput,
  Extraction,
  GraphState,
  Scope,
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
import { answerQuestion } from "./ai.js";
import { edge } from "./seed.js";
import { modelLabel } from "./model-config.js";
import { policies, topicOf, validClaimQuote } from "../shared/policies.js";

export class RippleService {
  private tail: Promise<unknown> = Promise.resolve();
  constructor(public repo: Repository) {}
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
            : process.env.FALKORDB_GRAPH || "ripple_hackathon",
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
}
