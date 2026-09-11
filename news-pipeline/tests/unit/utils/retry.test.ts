import { describe, expect, it, vi } from "vitest";

import { calculateRetryDelay, isRetryableHttpStatus, retry } from "../../../src/utils/retry.js";

describe("retry", () => {
  it("retries temporary failures with bounded exponential backoff", async () => {
    const operation = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error("temporal"))
      .mockRejectedValueOnce(new Error("temporal"))
      .mockResolvedValue("ok");
    const sleep = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);

    await expect(
      retry(operation, {
        maxRetries: 2,
        delayMs: 100,
        maxDelayMs: 150,
        shouldRetry: () => true,
        sleep,
      }),
    ).resolves.toBe("ok");

    expect(operation).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenNthCalledWith(1, 100);
    expect(sleep).toHaveBeenNthCalledWith(2, 150);
  });

  it("does not retry permanent failures", async () => {
    const operation = vi.fn<() => Promise<void>>().mockRejectedValue(new Error("permanente"));

    await expect(
      retry(operation, {
        maxRetries: 2,
        delayMs: 100,
        shouldRetry: () => false,
      }),
    ).rejects.toThrow("permanente");

    expect(operation).toHaveBeenCalledOnce();
  });

  it("recognizes the configured temporary HTTP statuses", () => {
    expect(isRetryableHttpStatus(429)).toBe(true);
    expect(isRetryableHttpStatus(502)).toBe(true);
    expect(isRetryableHttpStatus(503)).toBe(true);
    expect(isRetryableHttpStatus(404)).toBe(false);
    expect(calculateRetryDelay({ delayMs: 100, maxDelayMs: 150 }, 2)).toBe(150);
  });
});
