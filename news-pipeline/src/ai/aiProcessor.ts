import type { NewsCandidate } from "../domain/newsCandidate.js";
import type { ProcessedNewsResult } from "./schemas.js";

export type { AIProcessedNews, ProcessedNewsResult } from "./schemas.js";

export interface AIProcessor {
  process(candidate: NewsCandidate): Promise<ProcessedNewsResult>;
}
