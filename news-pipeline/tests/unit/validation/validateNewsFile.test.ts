import { describe, expect, it } from "vitest";

import { CATEGORIES } from "../../../src/domain/categories.js";
import { validateNewsFile } from "../../../src/validation/validateNewsFile.js";

const validNewsFile = {
  lastUpdatedAt: "2026-09-10T12:00:00Z",
  totalNews: 1,
  availableCategories: [...CATEGORIES],
  news: [
    {
      id: "segeplan-scholarship-2026",
      originalUrl: "https://example.gob.gt/scholarships/2026",
      source: "SEGEPLAN",
      sourceType: "announcement",
      categoryId: "education_scholarships",
      tags: ["becas", "universidad"],
      publishedAt: "2026-09-08T10:00:00Z",
      extractedAt: "2026-09-10T12:00:00Z",
      urgent: false,
      content: {
        es: {
          title: "Nueva convocatoria de becas",
          summary: "SEGEPLAN anunció una convocatoria para estudios universitarios.",
          citizenAction: "Consultar los requisitos de postulación.",
        },
        quc: {
          title: "K'ak' taqanik rech tob'anem tijonem",
          summary: "K'o jun k'ak' taqanik rech tijonem.",
          citizenAction: "Chawila' ri taq rajawaxik.",
        },
      },
    },
  ],
};

describe("validateNewsFile", () => {
  it("accepts a complete news file", () => {
    expect(validateNewsFile(validNewsFile)).toEqual(validNewsFile);
  });

  it("rejects an invented category", () => {
    const input = structuredClone(validNewsFile);
    input.news[0]!.categoryId = "unknown_category";

    expect(() => validateNewsFile(input)).toThrow();
  });

  it("rejects a missing K'iche' translation", () => {
    const input = structuredClone(validNewsFile);
    delete (input.news[0]!.content as { quc?: unknown }).quc;

    expect(() => validateNewsFile(input)).toThrow();
  });

  it("rejects an invalid date", () => {
    const input = { ...validNewsFile, lastUpdatedAt: "2026-09-10" };

    expect(() => validateNewsFile(input)).toThrow();
  });

  it("rejects inconsistent totalNews", () => {
    const input = { ...validNewsFile, totalNews: 2 };

    expect(() => validateNewsFile(input)).toThrow();
  });

  it("rejects duplicate news identifiers", () => {
    const input = {
      ...validNewsFile,
      totalNews: 2,
      news: [validNewsFile.news[0], validNewsFile.news[0]],
    };

    expect(() => validateNewsFile(input)).toThrow();
  });

  it("requires the complete category list in the defined order", () => {
    const input = { ...validNewsFile, availableCategories: [...CATEGORIES].reverse() };

    expect(() => validateNewsFile(input)).toThrow();
  });
});
