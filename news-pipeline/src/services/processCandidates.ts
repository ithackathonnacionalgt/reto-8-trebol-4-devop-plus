import type { AIProcessor } from "../ai/aiProcessor.js";
import type { NewsCandidate } from "../domain/newsCandidate.js";
import type { NewsItem } from "../domain/news.js";
import type { Logger } from "../utils/logger.js";
import { buildNewsId } from "../deduplication/buildNewsFingerprint.js";

export interface ProcessCandidatesResult {
  news: NewsItem[];
  irrelevantCount: number;
  failedCount: number;
}

export async function processCandidates(
  candidates: readonly NewsCandidate[],
  processor: AIProcessor,
  logger: Logger,
): Promise<ProcessCandidatesResult> {
  const news: NewsItem[] = [];
  let irrelevantCount = 0;
  let failedCount = 0;

  logger.info("Procesando candidatos con IA");
  for (const candidate of candidates) {
    try {
      const result = await processor.process(candidate);
      if (!result.relevant) {
        irrelevantCount += 1;
        logger.info("Noticia descartada por falta de relevancia ciudadana");
        continue;
      }

      const newsItem: NewsItem = {
        id: buildNewsId(candidate),
        originalUrl: candidate.originalUrl,
        source: candidate.source,
        sourceType: candidate.sourceType,
        categoryId: result.data.categoryId,
        tags: [...result.data.tags],
        publishedAt: candidate.publishedAt ?? null,
        extractedAt: candidate.extractedAt,
        urgent: result.data.urgent,
        content: {
          es: { ...result.data.content.es },
          quc: { ...result.data.content.quc },
        },
      };
      if (candidate.imageUrl !== undefined) newsItem.imageUrl = candidate.imageUrl;
      news.push(newsItem);
    } catch (error) {
      failedCount += 1;
      logger.error("No fue posible procesar una noticia después de los reintentos", {
        error,
      });
      logger.warn("La noticia será omitida en esta ejecución");
    }
  }

  logger.info(`${news.length} noticias aceptadas`);
  return { news, irrelevantCount, failedCount };
}
