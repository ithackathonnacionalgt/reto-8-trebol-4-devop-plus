import { describe, expect, it } from "vitest";

import type { NewsCandidate } from "../../../src/domain/newsCandidate.js";
import type { NewsItem } from "../../../src/domain/news.js";
import {
  buildCandidateIdentityKeys,
  buildNewsFingerprint,
  buildNewsId,
} from "../../../src/deduplication/buildNewsFingerprint.js";
import { deduplicateCandidates } from "../../../src/deduplication/deduplicateCandidates.js";
import { deduplicateNews } from "../../../src/deduplication/deduplicateNews.js";

const candidate = (overrides: Partial<NewsCandidate> = {}): NewsCandidate => ({
  source: "AGN",
  sourceType: "news",
  originalUrl: "https://agn.gt/noticia/uno",
  sourceId: "agn-uno",
  publishedAt: "2026-09-10T08:00:00Z",
  extractedAt: "2026-09-10T12:00:00Z",
  rawTitle: "Información pública",
  rawContent: "Contenido para ciudadanía.",
  ...overrides,
});

const historicalNews: NewsItem[] = [
  {
    id: "agn-uno",
    originalUrl: "https://agn.gt/noticia/uno",
    source: "AGN",
    sourceType: "news",
    categoryId: "social_programs",
    tags: ["información"],
    publishedAt: "2026-09-10T08:00:00Z",
    extractedAt: "2026-09-10T12:00:00Z",
    urgent: false,
    content: {
      es: { title: "Información", summary: "Resumen", citizenAction: "Consultar" },
      quc: { title: "Tzij", summary: "Tz'ib'", citizenAction: "Chawila'" },
    },
  },
];

describe("candidate identity and deduplication", () => {
  it("produces a stable id and fingerprint across executions", () => {
    const first = candidate();
    const second = candidate();

    expect(buildNewsId(first)).toBe("agn-agn-uno");
    expect(buildNewsId(first)).toBe(buildNewsId(second));
    expect(buildNewsFingerprint(first)).toBe(buildNewsFingerprint(second));
    expect(buildCandidateIdentityKeys(first)[0]).toBe("url:https://agn.gt/noticia/uno");
  });

  it("removes candidates with an existing normalized URL", () => {
    const result = deduplicateCandidates(
      [candidate({ originalUrl: "https://agn.gt/noticia/uno/?utm_source=feed" })],
      historicalNews,
    );

    expect(result).toEqual({ candidates: [], duplicateCount: 1 });
  });

  it("removes duplicates inside the same batch and keeps different news", () => {
    const result = deduplicateCandidates(
      [
        candidate({ sourceId: undefined }),
        candidate({ sourceId: undefined, originalUrl: "https://agn.gt/noticia/dos" }),
        candidate({
          sourceId: undefined,
          originalUrl: "https://agn.gt/noticia/dos/?utm_medium=email",
        }),
      ],
      [],
    );

    expect(result.duplicateCount).toBe(1);
    expect(result.candidates).toHaveLength(2);
  });

  it("does not use the title alone as an identity", () => {
    const result = deduplicateCandidates(
      [
        candidate({
          sourceId: undefined,
          originalUrl: "https://agn.gt/noticia/dos",
          rawTitle: "Información pública",
        }),
      ],
      [],
    );

    expect(result.candidates).toHaveLength(1);
  });

  it("deduplicates processed news by id or URL without mutating input", () => {
    const duplicateByUrl = { ...historicalNews[0], id: "different-id" };
    const input = [historicalNews[0], duplicateByUrl];
    const result = deduplicateNews(input);

    expect(result).toHaveLength(1);
    expect(result[0]).not.toBe(input[0]);
    expect(result[0]?.tags).not.toBe(input[0]?.tags);
  });
});
