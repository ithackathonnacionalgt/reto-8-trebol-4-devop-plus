import { z } from "zod";

import type { DeepSeekConfig } from "../../config/env.js";
import type { NewsCandidate } from "../../domain/newsCandidate.js";
import { AIError } from "../../errors/AIError.js";
import { isRetryableHttpStatus, retry } from "../../utils/retry.js";
import type { Sleep } from "../../utils/sleep.js";
import { sleep } from "../../utils/sleep.js";
import { buildAIPrompt } from "../prompts.js";
import { parseProcessedNewsResult, type ProcessedNewsResult } from "../schemas.js";
import type { AIProcessor } from "../aiProcessor.js";
import type { FetchImplementation } from "../../scraping/types.js";

const chatResponseSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({ content: z.string() }),
      }),
    )
    .min(1),
});

const RETRY_DELAY_MS = 500;

class DeepSeekRequestError extends AIError {
  public readonly status: number | undefined;
  public readonly retryable: boolean;

  public constructor(
    message: string,
    options: { status?: number; retryable: boolean; cause?: unknown },
  ) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.status = options.status;
    this.retryable = options.retryable;
  }
}

export class DeepSeekProcessor implements AIProcessor {
  private readonly config: DeepSeekConfig;
  private readonly fetchImplementation: FetchImplementation;
  private readonly retrySleep: Sleep;

  public constructor(
    config: DeepSeekConfig,
    fetchImplementation: FetchImplementation = fetch,
    retrySleep: Sleep = sleep,
  ) {
    this.config = config;
    this.fetchImplementation = fetchImplementation;
    this.retrySleep = retrySleep;
  }

  public async process(candidate: NewsCandidate): Promise<ProcessedNewsResult> {
    const prompt = buildAIPrompt(candidate);
    return retry(async () => this.request(prompt.system, prompt.user), {
      maxRetries: this.config.maxRetries,
      delayMs: RETRY_DELAY_MS,
      shouldRetry: (error) => error instanceof DeepSeekRequestError && error.retryable,
      sleep: this.retrySleep,
    });
  }

  private async request(systemPrompt: string, userPrompt: string): Promise<ProcessedNewsResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      let response: Response;
      try {
        response = await this.fetchImplementation(this.endpoint(), {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.config.apiKey}`,
          },
          body: JSON.stringify({
            model: this.config.model,
            temperature: 0,
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
          }),
          signal: controller.signal,
        });
      } catch (error) {
        throw new DeepSeekRequestError(
          controller.signal.aborted
            ? "La solicitud a la IA agotó el tiempo de espera"
            : "No fue posible completar la solicitud a la IA",
          { retryable: true, cause: error },
        );
      }

      if (!response.ok) {
        throw new DeepSeekRequestError(`La IA respondió con HTTP ${response.status}`, {
          status: response.status,
          retryable: isRetryableHttpStatus(response.status),
        });
      }

      let payload: unknown;
      try {
        payload = await response.json();
      } catch (error) {
        throw new DeepSeekRequestError("La IA devolvió una respuesta JSON ilegible", {
          retryable: true,
          cause: error,
        });
      }

      const envelope = chatResponseSchema.safeParse(payload);
      if (!envelope.success) {
        throw new DeepSeekRequestError("La respuesta de la IA no contiene una elección válida", {
          retryable: true,
          cause: envelope.error,
        });
      }

      const content = envelope.data.choices[0]?.message.content;
      if (content === undefined) {
        throw new DeepSeekRequestError("La respuesta de la IA no contiene contenido", {
          retryable: true,
        });
      }

      try {
        return parseProcessedNewsResult(content);
      } catch (error) {
        throw new DeepSeekRequestError("La IA devolvió una estructura inválida", {
          retryable: true,
          cause: error,
        });
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  private endpoint(): string {
    const baseUrl = this.config.baseUrl.endsWith("/")
      ? this.config.baseUrl
      : `${this.config.baseUrl}/`;
    return new URL("chat/completions", baseUrl).toString();
  }
}
