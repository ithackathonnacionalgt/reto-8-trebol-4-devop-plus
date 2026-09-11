import { describe, expect, it, vi } from "vitest";

import { DeepSeekProcessor } from "../../../src/ai/providers/deepseekProcessor.js";
import type { FetchImplementation } from "../../../src/scraping/types.js";

const config = {
  apiKey: "secret-api-key",
  baseUrl: "https://api.deepseek.example/v1",
  model: "deepseek-chat",
  timeoutMs: 100,
  maxRetries: 2,
};

const validContent = JSON.stringify({
  relevant: true,
  data: {
    categoryId: "education_scholarships",
    tags: ["becas"],
    urgent: false,
    content: {
      es: {
        title: "Convocatoria",
        summary: "Resumen ciudadano",
        citizenAction: "Consultar requisitos",
      },
      quc: {
        title: "Taqanik",
        summary: "Tz'ib'",
        citizenAction: "Chawila'",
      },
    },
  },
});

const candidate = {
  source: "AGN",
  sourceType: "news",
  originalUrl: "https://agn.gt/news/1",
  extractedAt: "2026-09-10T12:00:00Z",
  rawContent: "Contenido oficial",
};

const response = (content: string, status = 200): Response =>
  new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status });

describe("DeepSeekProcessor", () => {
  it("sends a structured request and validates relevant output", async () => {
    const fetchImplementation = vi
      .fn<FetchImplementation>()
      .mockResolvedValue(response(validContent));
    const processor = new DeepSeekProcessor(config, fetchImplementation);

    await expect(processor.process(candidate)).resolves.toMatchObject({ relevant: true });
    expect(fetchImplementation).toHaveBeenCalledWith(
      "https://api.deepseek.example/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer secret-api-key" }),
      }),
    );

    const request = fetchImplementation.mock.calls[0]?.[1];
    const body = JSON.parse(String(request?.body)) as { model: string; messages: unknown[] };
    expect(body.model).toBe("deepseek-chat");
    expect(body.messages).toHaveLength(2);
  });

  it("does not retry an invalid model JSON response", async () => {
    const fetchImplementation = vi
      .fn<FetchImplementation>()
      .mockResolvedValueOnce(response("not-json"))
      .mockResolvedValueOnce(response(validContent));
    const processor = new DeepSeekProcessor(
      config,
      fetchImplementation,
      vi.fn().mockResolvedValue(undefined),
    );

    await expect(processor.process(candidate)).rejects.toThrow(
      "La IA devolvió una estructura inválida",
    );
    expect(fetchImplementation).toHaveBeenCalledOnce();
  });

  it("retries temporary HTTP errors", async () => {
    const fetchImplementation = vi
      .fn<FetchImplementation>()
      .mockResolvedValueOnce(response("busy", 503))
      .mockResolvedValueOnce(response(JSON.stringify({ relevant: false })));
    const processor = new DeepSeekProcessor(
      config,
      fetchImplementation,
      vi.fn().mockResolvedValue(undefined),
    );

    await expect(processor.process(candidate)).resolves.toEqual({ relevant: false });
    expect(fetchImplementation).toHaveBeenCalledTimes(2);
  });

  it("does not retry permanent HTTP errors", async () => {
    const fetchImplementation = vi
      .fn<FetchImplementation>()
      .mockResolvedValue(response("denied", 400));
    const processor = new DeepSeekProcessor(
      config,
      fetchImplementation,
      vi.fn().mockResolvedValue(undefined),
    );

    await expect(processor.process(candidate)).rejects.toThrow("La IA respondió con HTTP 400");
    expect(fetchImplementation).toHaveBeenCalledOnce();
  });

  it("does not expose the API key when an error is thrown", async () => {
    const fetchImplementation = vi
      .fn<FetchImplementation>()
      .mockResolvedValue(response("denied", 400));
    const processor = new DeepSeekProcessor(config, fetchImplementation);

    await expect(processor.process(candidate)).rejects.not.toThrow("secret-api-key");
  });
});
