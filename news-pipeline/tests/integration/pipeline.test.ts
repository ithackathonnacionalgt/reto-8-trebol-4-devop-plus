import { describe, expect, it, vi } from "vitest";

import { runPipeline } from "../../src/app/runPipeline.js";
import type { ProcessedNewsResult } from "../../src/ai/aiProcessor.js";
import type { NewsItem } from "../../src/domain/news.js";
import { ValidationError } from "../../src/errors/ValidationError.js";
import { FakeAIProcessor } from "../helpers/fakeAIProcessor.js";
import { FakeNewsSource } from "../helpers/fakeNewsSource.js";
import { FakeNewsStorage } from "../helpers/fakeNewsStorage.js";

const fixedClock = () => new Date("2026-09-10T12:00:00Z");
const logger = () => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
});

const categories = [
  { id: "education_scholarships", name: "Educación y Becas" },
  { id: "health_wellbeing", name: "Salud y Prevención" },
  { id: "social_programs", name: "Apoyo Social" },
  { id: "procedures_services", name: "Trámites y Documentos" },
  { id: "security_alerts", name: "Alertas y Emergencias" },
  { id: "employment_development", name: "Empleo y Emprendimiento" },
] as const;

const historical = (id: string, source = "AGN"): NewsItem => ({
  id,
  originalUrl: `https://${source.toLowerCase()}.gt/news/${id}`,
  source,
  sourceType: "news",
  categoryId: "social_programs",
  tags: ["histórico"],
  publishedAt: "2026-09-09T12:00:00Z",
  extractedAt: "2026-09-10T10:00:00Z",
  urgent: false,
  content: {
    es: { title: `Histórica ${id}`, summary: "Resumen", citizenAction: "Consultar" },
    quc: { title: "Tzij", summary: "Tz'ib'", citizenAction: "Chawila'" },
  },
});

const candidate = (id: string, source = "AGN") => ({
  source,
  sourceType: "news",
  originalUrl: `https://${source.toLowerCase()}.gt/news/${id}`,
  extractedAt: "2026-09-10T11:00:00Z",
  rawContent: id,
});

const accepted = (id: string): ProcessedNewsResult => ({
  relevant: true,
  data: {
    categoryId: "social_programs",
    tags: [id],
    urgent: false,
    content: {
      es: { title: id, summary: "Resumen ciudadano", citizenAction: "Consultar" },
      quc: { title: "Tzij", summary: "Tz'ib'", citizenAction: "Chawila'" },
    },
  },
});

const baseFile = (news: NewsItem[]): NewsFile => ({
  lastUpdatedAt: "2026-09-09T12:00:00Z",
  totalNews: news.length,
  availableCategories: [...categories],
  news,
});

describe("pipeline integration", () => {
  it("preserves history, deduplicates before AI and consolidates the expected 5 news", async () => {
    const storage = new FakeNewsStorage(
      baseFile([historical("old-1"), historical("old-2"), historical("old-3")]),
    );
    const preview = new FakeNewsStorage();
    const candidates = [
      candidate("old-1"),
      candidate("new-1"),
      candidate("new-1"),
      candidate("new-2", "SEGEPLAN"),
      candidate("irrelevant"),
    ];
    const processor = new FakeAIProcessor((item) =>
      item.rawContent === "irrelevant"
        ? { relevant: false, reason: "No aplica" }
        : accepted(item.rawContent),
    );

    const result = await runPipeline({
      storage,
      previewStorage: preview,
      sources: [new FakeNewsSource("AGN", candidates)],
      aiProcessor: processor,
      logger: logger(),
      scraperDelayMs: 0,
      dryRun: true,
      clock: fixedClock,
    });

    expect(processor.processedCandidates.map((item) => item.rawContent)).toEqual([
      "new-1",
      "new-2",
      "irrelevant",
    ]);
    expect(result.totalNews).toBe(5);
    expect(result.news).toHaveLength(5);
    expect(result.news.filter((item) => item.id.includes("old")).length).toBe(3);
    expect(result.lastUpdatedAt).toBe("2026-09-10T12:00:00.000Z");
    expect(preview.saveCalls).toBe(1);
    expect(storage.saveCalls).toBe(0);
  });

  it("continues when one source fails", async () => {
    const storage = new FakeNewsStorage(null);
    const processor = new FakeAIProcessor(() => accepted("survivor"));
    const result = await runPipeline({
      storage,
      previewStorage: new FakeNewsStorage(),
      sources: [
        new FakeNewsSource("AGN", [], new Error("AGN no disponible")),
        new FakeNewsSource("SEGEPLAN", [candidate("survivor", "SEGEPLAN")]),
      ],
      aiProcessor: processor,
      logger: logger(),
      scraperDelayMs: 0,
      dryRun: true,
      clock: fixedClock,
    });
    expect(result.totalNews).toBe(1);
    expect(processor.processedCandidates).toHaveLength(1);
  });

  it("omits a definitive AI failure while processing the remaining candidates", async () => {
    const processor = new FakeAIProcessor((item) => {
      if (item.rawContent === "failed") throw new Error("modelo no disponible");
      return accepted(item.rawContent);
    });
    const result = await runPipeline({
      storage: new FakeNewsStorage(null),
      previewStorage: new FakeNewsStorage(),
      sources: [new FakeNewsSource("AGN", [candidate("failed"), candidate("ok")])],
      aiProcessor: processor,
      logger: logger(),
      scraperDelayMs: 0,
      dryRun: true,
      clock: fixedClock,
    });
    expect(processor.processedCandidates).toHaveLength(2);
    expect(result.totalNews).toBe(1);
  });

  it("initializes an empty history when no remote object exists", async () => {
    const preview = new FakeNewsStorage();
    const result = await runPipeline({
      storage: new FakeNewsStorage(null),
      previewStorage: preview,
      sources: [new FakeNewsSource("AGN")],
      aiProcessor: new FakeAIProcessor(() => accepted("unused")),
      logger: logger(),
      scraperDelayMs: 0,
      dryRun: true,
      clock: fixedClock,
    });
    expect(result.totalNews).toBe(0);
    expect(preview.saveCalls).toBe(1);
  });

  it("aborts when history cannot be loaded and never publishes", async () => {
    const storage = new FakeNewsStorage(null, { loadError: new Error("credenciales inválidas") });
    await expect(
      runPipeline({
        storage,
        previewStorage: new FakeNewsStorage(),
        sources: [new FakeNewsSource("AGN", [candidate("unused")])],
        aiProcessor: new FakeAIProcessor(() => accepted("unused")),
        logger: logger(),
        scraperDelayMs: 0,
        dryRun: false,
      }),
    ).rejects.toThrow("credenciales inválidas");
    expect(storage.saveCalls).toBe(0);
  });

  it("does not publish when final validation fails", async () => {
    const storage = new FakeNewsStorage(null);
    const invalidResult = {
      relevant: true,
      data: {
        categoryId: "invalid",
        tags: ["tag"],
        urgent: false,
        content: {
          es: { title: "Título", summary: "Resumen", citizenAction: "Consultar" },
          quc: { title: "Tzij", summary: "Tz'ib'", citizenAction: "Chawila'" },
        },
      },
    } as unknown as ProcessedNewsResult;
    await expect(
      runPipeline({
        storage,
        previewStorage: new FakeNewsStorage(),
        sources: [new FakeNewsSource("AGN", [candidate("invalid")])],
        aiProcessor: new FakeAIProcessor(() => invalidResult),
        logger: logger(),
        scraperDelayMs: 0,
        dryRun: false,
      }),
    ).rejects.toThrow(ValidationError);
    expect(storage.saveCalls).toBe(0);
  });

  it("keeps remote storage untouched during dry run", async () => {
    const storage = new FakeNewsStorage(baseFile([historical("old")]));
    const preview = new FakeNewsStorage();
    await runPipeline({
      storage,
      previewStorage: preview,
      sources: [new FakeNewsSource("AGN", [candidate("new")])],
      aiProcessor: new FakeAIProcessor(() => accepted("new")),
      logger: logger(),
      scraperDelayMs: 0,
      dryRun: true,
      clock: fixedClock,
    });
    expect(storage.saveCalls).toBe(0);
    expect(preview.saveCalls).toBe(1);
  });
});
