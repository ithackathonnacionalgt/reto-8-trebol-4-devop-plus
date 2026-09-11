import { SourceError } from "../errors/SourceError.js";
import { isRetryableHttpStatus, retry } from "../utils/retry.js";
import type { Sleep } from "../utils/sleep.js";
import { sleep } from "../utils/sleep.js";
import type { FetchImplementation, FetchPageOptions } from "./types.js";

export class HttpClientError extends SourceError {
  public readonly status: number | undefined;
  public readonly retryable: boolean;

  public constructor(
    message: string,
    options: { status?: number; retryable?: boolean; cause?: unknown } = {},
  ) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.status = options.status;
    this.retryable =
      options.retryable ?? (options.status !== undefined && isRetryableHttpStatus(options.status));
  }
}

export interface HttpClient {
  get(url: string, options: FetchPageOptions): Promise<string>;
}

export class NativeHttpClient implements HttpClient {
  private readonly fetchImplementation: FetchImplementation;
  private readonly retrySleep: Sleep;

  public constructor(fetchImplementation: FetchImplementation = fetch, retrySleep: Sleep = sleep) {
    this.fetchImplementation = fetchImplementation;
    this.retrySleep = retrySleep;
  }

  public async get(url: string, options: FetchPageOptions): Promise<string> {
    return retry(async () => this.request(url, options), {
      maxRetries: options.maxRetries,
      delayMs: options.delayMs,
      shouldRetry: (error) => error instanceof HttpClientError && error.retryable,
      sleep: this.retrySleep,
    });
  }

  private async request(url: string, options: FetchPageOptions): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs);

    try {
      let response: Response;
      try {
        response = await this.fetchImplementation(url, {
          method: "GET",
          headers: {
            Accept: "text/html,application/xhtml+xml",
            "User-Agent": options.userAgent,
            ...options.headers,
          },
          signal: controller.signal,
        });
      } catch (error) {
        const aborted = controller.signal.aborted;
        throw new HttpClientError(
          aborted
            ? "La solicitud HTTP agotó el tiempo de espera"
            : "No fue posible completar la solicitud HTTP",
          { retryable: true, cause: error },
        );
      }

      if (!response.ok) {
        throw new HttpClientError(`La fuente respondió con HTTP ${response.status}`, {
          status: response.status,
        });
      }

      try {
        return await response.text();
      } catch (error) {
        throw new HttpClientError("No fue posible leer la respuesta de la fuente", {
          retryable: true,
          cause: error,
        });
      }
    } finally {
      clearTimeout(timeout);
    }
  }
}
