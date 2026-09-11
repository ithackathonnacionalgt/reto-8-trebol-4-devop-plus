import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { AIError } from "../../../src/errors/AIError.js";
import { parseProcessedNewsResult, processedNewsResultSchema } from "../../../src/ai/schemas.js";

const fixture = (name: string): string =>
  readFileSync(new URL(`../../fixtures/ai/${name}`, import.meta.url), "utf8");

describe("processedNewsResultSchema", () => {
  it("accepts relevant and irrelevant responses", () => {
    expect(parseProcessedNewsResult(fixture("valid-response.json")).relevant).toBe(true);
    expect(parseProcessedNewsResult(fixture("irrelevant-response.json")).relevant).toBe(false);
  });

  it("rejects invented categories and malformed structures", () => {
    expect(() => parseProcessedNewsResult(fixture("invalid-response.json"))).toThrow(AIError);
    expect(() => parseProcessedNewsResult("not json")).toThrow(AIError);
    expect(processedNewsResultSchema.safeParse({ relevant: true }).success).toBe(false);
  });

  it("rejects extra fields to prevent unreviewed model output", () => {
    expect(() =>
      parseProcessedNewsResult({
        relevant: false,
        reason: "No aplica",
        data: { unexpected: true },
      }),
    ).toThrow();
  });
});
