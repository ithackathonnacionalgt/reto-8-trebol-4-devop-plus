import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

import { AgnNewsSource, parseAgnListing } from "../../../src/sources/providers/agnSource.js";

const fixture = readFileSync(
  new URL("../../fixtures/html/agn-sample.html", import.meta.url),
  "utf8",
);

describe("parseAgnListing", () => {
  it("extracts article candidates and ignores navigation links", () => {
    const candidates = parseAgnListing(fixture, "2026-09-10T12:00:00Z");

    expect(candidates).toHaveLength(2);
    expect(candidates[0]).toMatchObject({
      source: "AGN",
      sourceType: "news",
      originalUrl: "https://agn.gt/presidente-firma-agenda-territorial",
      sourceId: "presidente-firma-agenda-territorial",
      publishedAt: "2026-09-10T00:00:00.000Z",
      rawTitle: "Presidente firma agenda territorial",
    });
    expect(candidates[1]?.originalUrl).toBe("https://agn.gt/medidas-para-la-poblacion");
  });

  it("limits the number of candidates per collection", () => {
    expect(parseAgnListing(fixture, "2026-09-10T12:00:00Z", 1)).toHaveLength(1);
  });
});

describe("AgnNewsSource", () => {
  it("uses the shared HTTP client and extraction timestamp", async () => {
    const client = {
      get: vi.fn().mockResolvedValue(fixture),
    };
    const source = new AgnNewsSource(client, {
      fetchOptions: {
        timeoutMs: 15000,
        userAgent: "TestPipeline/1.0",
        maxRetries: 0,
        delayMs: 0,
      },
      clock: () => new Date("2026-09-10T12:00:00Z"),
    });

    await expect(source.fetchCandidates()).resolves.toHaveLength(2);
    expect(client.get).toHaveBeenCalledWith(
      "https://agn.gt/ultimas-noticias/",
      expect.objectContaining({ userAgent: "TestPipeline/1.0" }),
    );
  });

  it("fails when the markup no longer exposes article blocks", async () => {
    const client = { get: vi.fn().mockResolvedValue("<html><body>Sin artículos</body></html>") };
    const source = new AgnNewsSource(client, {
      fetchOptions: {
        timeoutMs: 15000,
        userAgent: "TestPipeline/1.0",
        maxRetries: 0,
        delayMs: 0,
      },
    });

    await expect(source.fetchCandidates()).rejects.toThrow("no contiene artículos reconocibles");
  });
});
