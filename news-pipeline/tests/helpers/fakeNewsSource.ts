import type { NewsCandidate } from "../../src/domain/newsCandidate.js";
import type { NewsSource } from "../../src/sources/newsSource.js";

export class FakeNewsSource implements NewsSource {
  public readonly name: string;
  public fetchCalls = 0;
  private readonly candidates: NewsCandidate[];
  private readonly error: Error | undefined;

  public constructor(name: string, candidates: NewsCandidate[] = [], error?: Error) {
    this.name = name;
    this.candidates = candidates;
    this.error = error;
  }

  public async fetchCandidates(): Promise<NewsCandidate[]> {
    this.fetchCalls += 1;
    if (this.error !== undefined) {
      throw this.error;
    }
    return this.candidates.map((candidate) => ({ ...candidate }));
  }
}
