import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import {
  MingobNewsSource,
  parseMingobListing,
} from "../../../src/sources/providers/ministries/mingobSource.js";

const fixture = readFileSync(
  new URL("../../fixtures/html/mingob-sample.html", import.meta.url),
  "utf8",
);

describe("parseMingobListing", () => {
  it("extracts MINGOB headlines and image URLs", () => {
    const candidates = parseMingobListing(fixture, "2026-09-10T12:00:00Z");
    expect(candidates).toHaveLength(2);
    expect(candidates[0]).toMatchObject({
      source: "MINGOB",
      originalUrl: "https://mingob.gob.gt/noticia-seguridad",
      imageUrl: "https://mingob.gob.gt/wp-content/uploads/2026/09/seguridad.jpg",
      publishedAt: "2026-09-10T00:00:00.000Z",
    });
  });
});

describe("MingobNewsSource", () => {
  it("uses the configured HTTP client", async () => {
    const client = { get: vi.fn().mockResolvedValue(fixture) };
    const source = new MingobNewsSource(client, {
      fetchOptions: { timeoutMs: 15000, userAgent: "Test/1.0", maxRetries: 0, delayMs: 0 },
      clock: () => new Date("2026-09-10T12:00:00Z"),
    });
    await expect(source.fetchCandidates()).resolves.toHaveLength(2);
    expect(client.get).toHaveBeenCalledWith(
      "https://mingob.gob.gt/category/noticias/actualidad/",
      expect.anything(),
    );
  });
});
