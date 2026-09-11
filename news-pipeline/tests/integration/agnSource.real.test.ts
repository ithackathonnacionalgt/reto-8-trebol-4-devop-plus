import { describe, expect, it } from "vitest";

import { AgnNewsSource } from "../../src/sources/providers/agnSource.js";
import { NativeHttpClient } from "../../src/scraping/httpClient.js";

const runRealSourceTests = process.env.RUN_REAL_SOURCE_TESTS === "true";

describe.skipIf(!runRealSourceTests)("AGN real source", () => {
  it("fetches at least one candidate from the observed listing", async () => {
    const source = new AgnNewsSource(new NativeHttpClient(), {
      fetchOptions: {
        timeoutMs: 15_000,
        userAgent: "GovernmentNewsPipeline/1.0",
        maxRetries: 1,
        delayMs: 1_000,
      },
    });

    const candidates = await source.fetchCandidates();
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates[0]?.originalUrl).toMatch(/^https:\/\/agn\.gt\//);
  });
});
