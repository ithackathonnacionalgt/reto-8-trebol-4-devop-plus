import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

import {
  MintrabNewsSource,
  parseMintrabListing,
} from "../../../src/sources/providers/ministries/mintrabSource.js";

const fixture = readFileSync(
  new URL("../../fixtures/html/mintrab-sample.html", import.meta.url),
  "utf8",
);

describe("parseMintrabListing", () => {
  it("extracts employment candidates from MINTRAB markup", () => {
    const candidates = parseMintrabListing(fixture, "2026-09-10T12:00:00Z");

    expect(candidates).toHaveLength(2);
    expect(candidates[0]).toMatchObject({
      source: "MINTRAB",
      sourceType: "news",
      originalUrl: "https://mintrabajo.gob.gt/convocatoria-feria-nacional-de-empleo-2026",
      sourceId: "convocatoria-feria-nacional-de-empleo-2026",
      publishedAt: "2026-09-09T00:00:00.000Z",
      imageUrl: "https://mintrabajo.gob.gt/images/feria-empleo-quetzaltenango.jpg",
      rawTitle: "MINTRAB anuncia Feria Nacional de Empleo en Quetzaltenango",
    });
    expect(candidates[1]?.originalUrl).toBe(
      "https://mintrabajo.gob.gt/programa-de-trabajo-temporal-extranjero-abierto",
    );
    expect(candidates[1]?.publishedAt).toBe("2026-09-05T00:00:00.000Z");
  });

  it("limits the number of candidates per collection", () => {
    expect(parseMintrabListing(fixture, "2026-09-10T12:00:00Z", 1)).toHaveLength(1);
  });
});

describe("MintrabNewsSource", () => {
  it("uses the shared HTTP client and extraction timestamp", async () => {
    const client = {
      get: vi.fn().mockResolvedValue(fixture),
    };
    const source = new MintrabNewsSource(client, {
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
      "https://mintrabajo.gob.gt/noticias/",
      expect.objectContaining({ userAgent: "TestPipeline/1.0" }),
    );
  });

  it("fails when the markup does not contain any recognizable article blocks", async () => {
    const client = { get: vi.fn().mockResolvedValue("<html><body>Sin noticias</body></html>") };
    const source = new MintrabNewsSource(client, {
      fetchOptions: {
        timeoutMs: 15000,
        userAgent: "TestPipeline/1.0",
        maxRetries: 0,
        delayMs: 0,
      },
    });

    await expect(source.fetchCandidates()).rejects.toThrow("no contiene convocatorias");
  });
});
