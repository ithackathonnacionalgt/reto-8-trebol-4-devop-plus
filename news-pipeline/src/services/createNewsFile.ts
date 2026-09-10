import { CATEGORIES } from "../domain/categories.js";
import type { NewsFile } from "../domain/newsFile.js";
import type { NewsItem } from "../domain/news.js";
import type { Clock } from "../utils/dates.js";
import { nowAsIsoString } from "../utils/dates.js";

export function createNewsFile(news: readonly NewsItem[], clock?: Clock): NewsFile {
  return {
    lastUpdatedAt: nowAsIsoString(clock),
    totalNews: news.length,
    availableCategories: CATEGORIES.map((category) => ({ ...category })),
    news: news.map((newsItem) => ({
      ...newsItem,
      tags: [...newsItem.tags],
      content: {
        es: { ...newsItem.content.es },
        quc: { ...newsItem.content.quc },
      },
    })),
  };
}
