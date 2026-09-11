import type { NewsCandidate } from "../../src/domain/newsCandidate.js";
import type { AIProcessor, ProcessedNewsResult } from "../../src/ai/aiProcessor.js";

export class FakeAIProcessor implements AIProcessor {
  public readonly processedCandidates: NewsCandidate[] = [];
  private readonly resultForCandidate: (candidate: NewsCandidate) => ProcessedNewsResult;

  public constructor(resultForCandidate: (candidate: NewsCandidate) => ProcessedNewsResult) {
    this.resultForCandidate = resultForCandidate;
  }

  public async process(candidate: NewsCandidate): Promise<ProcessedNewsResult> {
    this.processedCandidates.push({ ...candidate });
    return this.resultForCandidate(candidate);
  }
}
