import { describe, expect, it, vi } from "vitest";

import type { NewsItem } from "../../../src/domain/news.js";
import { consolidateNews } from "../../../src/services/consolidateNews.js";
import { createNewsFile } from "../../../src/services/createNewsFile.js";
import { loadHistoricalNews } from "../../../src/services/loadHistoricalNews.js";
import { processCandidates } from "../../../src/services/processCandidates.js";
import { publishNews } from "../../../src/services/publishNews.js";
import type { NewsStorage } from "../../../src/storage/newsStorage.js";
import { FakeAIProcessor } from "../../helpers/fakeAIProcessor.js";
import { FakeNewsStorage } from "../../helpers/fakeNewsStorage.js";

const logger = () => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
});

const fixedClock = () => new Date("2026-09-10T12:00:00Z");

const news = (id: string, publishedAt = "2026-09-09T12:00:00Z"): NewsItem => ({
  id,
  originalUrl: `https://agn.gt/news/${id}`,
  source: "AGN",
  sourceType: "news",
  categoryId: "social_programs",
  tags: ["ciudadanía"],
  publishedAt,
  extractedAt: "2026-09-10T12:00:00Z",
  urgent: false,
  content: {
    es: { title: id, summary: "Resumen", citizenAction: "Consultar" },
    quc: { title: "Tzij", summary: "Tz'ib'", citizenAction: "Chawila'" },
  },
});

const acceptedResult = {
  relevant: true as const,
  data: {
    categoryId: "social_programs" as const,
    tags: ["apoyo"],
    urgent: false,
    content: {
      es: { title: "Apoyo", summary: "Resumen", citizenAction: "Consultar" },
      quc: { title: "Tob'anem", summary: "Tz'ib'", citizenAction: "Chawila'" },
    },
  },
};

describe("news services", () => {
  it("loads an empty historical document when storage has no object", async () => {
    const storage = new FakeNewsStorage(null);

    await expect(loadHistoricalNews(storage, logger(), fixedClock)).resolves.toMatchObject({
      totalNews: 0,
      news: [],
      lastUpdatedAt: "2026-09-10T12:00:00.000Z",
    });
  });

  it("processes accepted, irrelevant and failed candidates independently", async () => {
    const candidates = [
      {
        source: "AGN",
        sourceType: "news",
        originalUrl: "https://agn.gt/news/accepted",
        extractedAt: "2026-09-10T12:00:00Z",
        rawContent: "accepted",
      },
      {
        source: "AGN",
        sourceType: "news",
        originalUrl: "https://agn.gt/news/irrelevant",
        extractedAt: "2026-09-10T12:00:00Z",
        rawContent: "irrelevant",
      },
      {
        source: "AGN",
        sourceType: "news",
        originalUrl: "https://agn.gt/news/failed",
        extractedAt: "2026-09-10T12:00:00Z",
        rawContent: "failed",
      },
    ];
    const processor = new FakeAIProcessor((candidate) => {
      if (candidate.rawContent === "irrelevant") {
        return { relevant: false, reason: "No aplica" };
      }
      if (candidate.rawContent === "failed") {
        throw new Error("fallo definitivo");
      }
      return acceptedResult;
    });

    await expect(processCandidates(candidates, processor, logger())).resolves.toMatchObject({
      news: [{ source: "AGN", categoryId: "social_programs" }],
      irrelevantCount: 1,
      failedCount: 1,
    });
  });

  it("conserves history, adds valid news and does not mutate arrays", () => {
    const historical = [news("old")];
    const additions = [news("new", "2026-09-10T11:00:00Z")];
    const result = consolidateNews(historical, additions, fixedClock);

    expect(result.totalNews).toBe(2);
    expect(result.news.map((item) => item.id)).toEqual(["new", "old"]);
    expect(historical).toEqual([news("old")]);
    expect(additions).toEqual([news("new", "2026-09-10T11:00:00Z")]);
  });

  it("publishes only a valid final document", async () => {
    const storage = new FakeNewsStorage();
    const valid = createNewsFile([], fixedClock);

    await publishNews(storage, valid, logger());
    expect(storage.saveCalls).toBe(1);
    expect(storage.savedNewsFile).toEqual(valid);

    await expect(publishNews(storage, { ...valid, totalNews: 1 }, logger())).rejects.toThrow(
      "no será publicado",
    );
    expect(storage.saveCalls).toBe(1);
  });

  it("propagates fatal historical and storage errors", async () => {
    const loadFailure = new Error("credenciales inválidas");
    const failingLoad: NewsStorage = new FakeNewsStorage(null, { loadError: loadFailure });
    await expect(loadHistoricalNews(failingLoad, logger())).rejects.toThrow(loadFailure);

    const failingSave = new FakeNewsStorage(null, { saveError: new Error("R2 caído") });
    await expect(
      publishNews(failingSave, createNewsFile([], fixedClock), logger()),
    ).rejects.toThrow("R2 caído");
  });
});
