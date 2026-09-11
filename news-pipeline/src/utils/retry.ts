import type { Sleep } from "./sleep.js";
import { sleep } from "./sleep.js";

export interface RetryOptions {
  maxRetries: number;
  delayMs: number;
  maxDelayMs?: number;
  shouldRetry: (error: unknown, failedAttempt: number) => boolean;
  sleep?: Sleep;
  onRetry?: (error: unknown, failedAttempt: number, delayMs: number) => void;
}

export async function retry<T>(operation: () => Promise<T>, options: RetryOptions): Promise<T> {
  let failedAttempt = 0;

  while (true) {
    try {
      return await operation();
    } catch (error) {
      if (failedAttempt >= options.maxRetries || !options.shouldRetry(error, failedAttempt + 1)) {
        throw error;
      }

      failedAttempt += 1;
      const delayMs = calculateRetryDelay(options, failedAttempt);
      options.onRetry?.(error, failedAttempt, delayMs);
      await (options.sleep ?? sleep)(delayMs);
    }
  }
}

export function calculateRetryDelay(
  options: Pick<RetryOptions, "delayMs" | "maxDelayMs">,
  attempt: number,
): number {
  const delay = options.delayMs * 2 ** (attempt - 1);
  return options.maxDelayMs === undefined ? delay : Math.min(delay, options.maxDelayMs);
}

export function isRetryableHttpStatus(status: number): boolean {
  return status === 429 || status === 502 || status === 503;
}
