import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

import {
  parseSegeplanListing,
  SegeplanNewsSource,
} from "../../../src/sources/providers/segeplanSource.js";

const fixture = readFileSync(
  new URL("../../fixtures/html/segeplan-sample.html", import.meta.url),
  "utf8",
);

describe("parseSegeplanListing", () => {
  it("extracts notes, preserves WordPress ids and ignores navigation", () => {
    const candidates = parseSegeplanListing(fixture, "2026-09-10T12:00:00Z");

    expect(candidates).toHaveLength(2);
    expect(candidates[0]).toMatchObject({
      source: "SEGEPLAN",
      sourceType: "news",
      originalUrl: "https://portal.segeplan.gob.gt/segeplan?p=15105",
      sourceId: "post-15105",
      publishedAt: "2026-04-15T00:00:00.000Z",
      imageUrl: "https://portal.segeplan.gob.gt/media/becas.jpg",
      rawTitle: "SEGEPLAN anuncia convocatoria de becas",
    });
    expect(candidates[1]?.originalUrl).toBe(
      "https://portal.segeplan.gob.gt/nota/planificacion-territorial",
    );
  });

  it("limits results per collection", () => {
    expect(parseSegeplanListing(fixture, "2026-09-10T12:00:00Z", 1)).toHaveLength(1);
  });
});

describe("SegeplanNewsSource", () => {
  it("uses the shared client and configured listing URL", async () => {
    const client = { get: vi.fn().mockResolvedValue(fixture) };
    const source = new SegeplanNewsSource(client, {
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
      "https://portal.segeplan.gob.gt/segeplan/?page_id=7505",
      expect.objectContaining({ userAgent: "TestPipeline/1.0" }),
    );
  });

  it("fails when no note can be recognized", async () => {
    const source = new SegeplanNewsSource(
      { get: vi.fn().mockResolvedValue("<html><body>Sin notas</body></html>") },
      {
        fetchOptions: {
          timeoutMs: 15000,
          userAgent: "TestPipeline/1.0",
          maxRetries: 0,
          delayMs: 0,
        },
      },
    );

    await expect(source.fetchCandidates()).rejects.toThrow("no contiene notas reconocibles");
  });
});
