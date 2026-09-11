import type { NewsCandidate } from "../domain/newsCandidate.js";
import { SourceError } from "../errors/SourceError.js";
import type { Logger } from "../utils/logger.js";
import type { Sleep } from "../utils/sleep.js";
import { sleep } from "../utils/sleep.js";
import type { NewsSource } from "../sources/newsSource.js";

export interface CollectCandidatesOptions {
  delayMs: number;
  logger: Logger;
  sleep?: Sleep;
}

export interface CandidateCollectionResult {
  candidates: NewsCandidate[];
  attemptedSources: number;
  failedSources: string[];
  allSourcesFailed: boolean;
}

export async function collectCandidates(
  sources: readonly NewsSource[],
  options: CollectCandidatesOptions,
): Promise<CandidateCollectionResult> {
  const candidates: NewsCandidate[] = [];
  const failedSources: string[] = [];
  const wait = options.sleep ?? sleep;

  for (const [index, source] of sources.entries()) {
    if (index > 0 && options.delayMs > 0) {
      options.logger.debug("Esperando antes de consultar la siguiente fuente", {
        delayMs: options.delayMs,
      });
      await wait(options.delayMs);
    }

    options.logger.info(`Consultando fuente ${source.name}`);
    try {
      const sourceCandidates = await source.fetchCandidates();
      if (!Array.isArray(sourceCandidates)) {
        throw new SourceError(`La fuente ${source.name} devolvió un resultado inválido`);
      }
      candidates.push(...sourceCandidates);
      options.logger.info(`${sourceCandidates.length} candidatos encontrados en ${source.name}`);
    } catch (error) {
      failedSources.push(source.name);
      options.logger.error(`No fue posible consultar la fuente ${source.name}`, {
        error,
      });
      options.logger.warn("Se continuará con las demás fuentes");
    }
  }

  return {
    candidates,
    attemptedSources: sources.length,
    failedSources,
    allSourcesFailed: sources.length > 0 && failedSources.length === sources.length,
  };
}
