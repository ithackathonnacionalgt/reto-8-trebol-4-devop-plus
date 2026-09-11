import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

import {
  ConredNewsSource,
  parseConredListing,
} from "../../../src/sources/providers/ministries/conredSource.js";

const fixture = readFileSync(
  new URL("../../fixtures/html/conred-sample.html", import.meta.url),
  "utf8",
);

describe("parseConredListing", () => {
  it("extracts emergency and alert candidates from CONRED markup", () => {
    const candidates = parseConredListing(fixture, "2026-09-10T12:00:00Z");

    expect(candidates).toHaveLength(2);
    expect(candidates[0]).toMatchObject({
      source: "CONRED",
      sourceType: "news",
      originalUrl: "https://conred.gob.gt/alerta-naranja-por-temporada-de-lluvias",
      sourceId: "alerta-naranja-por-temporada-de-lluvias",
      publishedAt: "2026-09-10T00:00:00.000Z",
      imageUrl: "https://conred.gob.gt/media/alerta-lluvias.jpg",
      rawTitle: "CONRED declara alerta naranja institucional por lluvias",
    });
    expect(candidates[1]?.originalUrl).toBe(
      "https://conred.gob.gt/monitoreo-preventivo-actividad-volcan-de-fuego",
    );
    expect(candidates[1]?.publishedAt).toBe("2026-09-08T00:00:00.000Z");
  });

  it("limits the number of candidates per collection", () => {
    expect(parseConredListing(fixture, "2026-09-10T12:00:00Z", 1)).toHaveLength(1);
  });
});

describe("ConredNewsSource", () => {
  it("uses the shared HTTP client and extraction timestamp", async () => {
    const client = {
      get: vi.fn().mockResolvedValue(fixture),
    };
    const source = new ConredNewsSource(client, {
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
      "https://conred.gob.gt/noticias/",
      expect.objectContaining({ userAgent: "TestPipeline/1.0" }),
    );
  });

  it("fails when the markup does not contain any recognizable article blocks", async () => {
    const client = { get: vi.fn().mockResolvedValue("<html><body>Sin boletines</body></html>") };
    const source = new ConredNewsSource(client, {
      fetchOptions: {
        timeoutMs: 15000,
        userAgent: "TestPipeline/1.0",
        maxRetries: 0,
        delayMs: 0,
      },
    });

    await expect(source.fetchCandidates()).rejects.toThrow("no contiene boletines");
  });
});
