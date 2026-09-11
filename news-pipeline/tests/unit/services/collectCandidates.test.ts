import { describe, expect, it, vi } from "vitest";

import { collectCandidates } from "../../../src/services/collectCandidates.js";
import { FakeNewsSource } from "../../helpers/fakeNewsSource.js";

const candidate = {
  source: "AGN",
  sourceType: "news",
  originalUrl: "https://agn.gt/noticia/uno",
  extractedAt: "2026-09-10T12:00:00Z",
  rawContent: "Contenido",
};

const logger = () => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
});

describe("collectCandidates", () => {
  it("collects healthy sources and isolates a failed source", async () => {
    const first = new FakeNewsSource("AGN", [candidate]);
    const failed = new FakeNewsSource("SEGEPLAN", [], new Error("sitio no disponible"));
    const third = new FakeNewsSource("MINEDUC", [{ ...candidate, source: "MINEDUC" }]);
    const wait = vi.fn().mockResolvedValue(undefined);
    const result = await collectCandidates([first, failed, third], {
      delayMs: 100,
      logger: logger(),
      sleep: wait,
    });

    expect(result.candidates).toHaveLength(2);
    expect(result.failedSources).toEqual(["SEGEPLAN"]);
    expect(result.allSourcesFailed).toBe(false);
    expect(wait).toHaveBeenCalledTimes(2);
    expect(first.fetchCalls).toBe(1);
    expect(failed.fetchCalls).toBe(1);
    expect(third.fetchCalls).toBe(1);
  });

  it("marks the all-failed state without throwing", async () => {
    const result = await collectCandidates([new FakeNewsSource("AGN", [], new Error("fallo"))], {
      delayMs: 0,
      logger: logger(),
    });

    expect(result).toMatchObject({
      candidates: [],
      attemptedSources: 1,
      failedSources: ["AGN"],
      allSourcesFailed: true,
    });
  });

  it("returns an empty non-failed result when no sources are enabled", async () => {
    await expect(collectCandidates([], { delayMs: 0, logger: logger() })).resolves.toMatchObject({
      candidates: [],
      attemptedSources: 0,
      failedSources: [],
      allSourcesFailed: false,
    });
  });
});
