import type { NewsCandidate } from "../domain/newsCandidate.js";

export interface NewsSource {
  readonly name: string;

  fetchCandidates(): Promise<NewsCandidate[]>;
}
