import { CATEGORIES } from "../domain/categories.js";
import type { NewsFile } from "../domain/newsFile.js";
import type { Logger } from "../utils/logger.js";
import type { Clock } from "../utils/dates.js";
import { nowAsIsoString } from "../utils/dates.js";
import type { NewsStorage } from "../storage/newsStorage.js";

export async function loadHistoricalNews(
  storage: NewsStorage,
  logger: Logger,
  clock?: Clock,
): Promise<NewsFile> {
  logger.info("Cargando histórico de noticias");
  const historicalNews = await storage.load();

  if (historicalNews === null) {
    logger.info("No existe histórico; se iniciará con un documento vacío");
    return emptyNewsFile(clock);
  }

  logger.info(`${historicalNews.totalNews} noticias existentes`);
  return historicalNews;
}

function emptyNewsFile(clock?: Clock): NewsFile {
  return {
    lastUpdatedAt: nowAsIsoString(clock),
    totalNews: 0,
    availableCategories: CATEGORIES.map((category) => ({ ...category })),
    news: [],
  };
}
