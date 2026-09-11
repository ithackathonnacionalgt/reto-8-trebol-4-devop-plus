import { describe, expect, it } from "vitest";

import { NativeHttpClient } from "../../src/scraping/httpClient.js";
import { SegeplanNewsSource } from "../../src/sources/providers/segeplanSource.js";

const runRealSourceTests = process.env.RUN_REAL_SOURCE_TESTS === "true";

describe.skipIf(!runRealSourceTests)("SEGEPLAN real source", () => {
  it("fetches at least one note from the observed listing", async () => {
    const source = new SegeplanNewsSource(new NativeHttpClient(), {
      fetchOptions: {
        timeoutMs: 15_000,
        userAgent: "GovernmentNewsPipeline/1.0",
        maxRetries: 1,
        delayMs: 1_000,
      },
    });

    const candidates = await source.fetchCandidates();
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates[0]?.originalUrl).toMatch(/^https:\/\/portal\.segeplan\.gob\.gt\//);
  });
});
