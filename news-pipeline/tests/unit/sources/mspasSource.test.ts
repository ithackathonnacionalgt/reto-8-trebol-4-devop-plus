import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

import {
  MspasNewsSource,
  parseMspasListing,
} from "../../../src/sources/providers/ministries/mspasSource.js";

const fixture = readFileSync(
  new URL("../../fixtures/html/mspas-sample.html", import.meta.url),
  "utf8",
);

describe("parseMspasListing", () => {
  it("extracts health candidates from MSPAS markup", () => {
    const candidates = parseMspasListing(fixture, "2026-09-10T12:00:00Z");

    expect(candidates).toHaveLength(2);
    expect(candidates[0]).toMatchObject({
      source: "MSPAS",
      sourceType: "news",
      originalUrl: "https://salud.gob.gt/jornada-nacional-de-vacunacion-infantil-2026",
      sourceId: "jornada-nacional-de-vacunacion-infantil-2026",
      publishedAt: "2026-09-10T00:00:00.000Z",
      imageUrl: "https://salud.gob.gt/media/vacunacion-nacional.jpg",
      rawTitle: "MSPAS inicia Jornada Nacional de Vacunación Infantil y Preventiva",
    });
    expect(candidates[1]?.originalUrl).toBe(
      "https://www.mspas.gob.gt/acciones-contra-dengue-departamentos-priorizados",
    );
    expect(candidates[1]?.publishedAt).toBe("2026-09-07T00:00:00.000Z");
  });

  it("limits the number of candidates per collection", () => {
    expect(parseMspasListing(fixture, "2026-09-10T12:00:00Z", 1)).toHaveLength(1);
  });
});

describe("MspasNewsSource", () => {
  it("uses the shared HTTP client and extraction timestamp", async () => {
    const client = {
      get: vi.fn().mockResolvedValue(fixture),
    };
    const source = new MspasNewsSource(client, {
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
      "https://www.mspas.gob.gt/noticias-mspas",
      expect.objectContaining({ userAgent: "TestPipeline/1.0" }),
    );
  });

  it("fails when the markup does not contain any recognizable article blocks", async () => {
    const client = { get: vi.fn().mockResolvedValue("<html><body>Sin notas</body></html>") };
    const source = new MspasNewsSource(client, {
      fetchOptions: {
        timeoutMs: 15000,
        userAgent: "TestPipeline/1.0",
        maxRetries: 0,
        delayMs: 0,
      },
    });

    await expect(source.fetchCandidates()).rejects.toThrow("no contiene comunicados");
  });
});
