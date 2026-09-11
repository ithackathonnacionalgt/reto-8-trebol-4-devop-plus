import type { AIProcessor, ProcessedNewsResult } from "../aiProcessor.js";

export class MockAIProcessor implements AIProcessor {
  public async process(): Promise<ProcessedNewsResult> {
    return {
      relevant: false,
      reason: "Procesador simulado habilitado para desarrollo local",
    };
  }
}
