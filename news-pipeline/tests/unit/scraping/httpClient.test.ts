import { describe, expect, it, vi } from "vitest";

import { HttpClientError, NativeHttpClient } from "../../../src/scraping/httpClient.js";

const options = {
  timeoutMs: 100,
  userAgent: "TestPipeline/1.0",
  maxRetries: 2,
  delayMs: 1,
};

describe("NativeHttpClient", () => {
  it("uses the configured User-Agent and returns HTML", async () => {
    const fetchImplementation = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("<html>ok</html>", { status: 200 }));
    const client = new NativeHttpClient(fetchImplementation, vi.fn().mockResolvedValue(undefined));

    await expect(client.get("https://example.gt", options)).resolves.toBe("<html>ok</html>");
    expect(fetchImplementation).toHaveBeenCalledWith(
      "https://example.gt",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({ "User-Agent": "TestPipeline/1.0" }),
      }),
    );
  });

  it("retries temporary statuses and then succeeds", async () => {
    const fetchImplementation = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response("busy", { status: 503 }))
      .mockResolvedValueOnce(new Response("ok", { status: 200 }));
    const client = new NativeHttpClient(fetchImplementation, vi.fn().mockResolvedValue(undefined));

    await expect(client.get("https://example.gt", options)).resolves.toBe("ok");
    expect(fetchImplementation).toHaveBeenCalledTimes(2);
  });

  it("does not retry a permanent 404", async () => {
    const fetchImplementation = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("missing", { status: 404 }));
    const client = new NativeHttpClient(fetchImplementation, vi.fn().mockResolvedValue(undefined));

    await expect(client.get("https://example.gt", options)).rejects.toMatchObject({
      status: 404,
      retryable: false,
    } satisfies Partial<HttpClientError>);
    expect(fetchImplementation).toHaveBeenCalledOnce();
  });

  it("aborts a request after the configured timeout", async () => {
    const fetchImplementation: typeof fetch = (_input, init) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new Error("aborted")));
      });
    const client = new NativeHttpClient(fetchImplementation, vi.fn().mockResolvedValue(undefined));

    await expect(
      client.get("https://example.gt", { ...options, timeoutMs: 5 }),
    ).rejects.toMatchObject({
      retryable: true,
    });
  });
});
