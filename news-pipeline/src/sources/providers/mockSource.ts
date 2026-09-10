import type { NewsCandidate } from "../../domain/newsCandidate.js";
import { SourceError } from "../../errors/SourceError.js";
import type { NewsSource } from "../newsSource.js";

export class MockNewsSource implements NewsSource {
  public readonly name: string;
  private readonly candidates: readonly NewsCandidate[];
  private readonly failure: Error | undefined;

  public constructor(name: string, candidates: readonly NewsCandidate[] = [], failure?: Error) {
    this.name = name;
    this.candidates = candidates;
    this.failure = failure;
  }

  public async fetchCandidates(): Promise<NewsCandidate[]> {
    if (this.failure !== undefined) {
      throw new SourceError(`La fuente simulada ${this.name} falló`, {
        cause: this.failure,
      });
    }
    return this.candidates.map((candidate) => ({ ...candidate }));
  }
}
