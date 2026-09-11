import type { NewsFile } from "../domain/newsFile.js";
import type { NewsItem } from "../domain/news.js";
import { deduplicateNews } from "../deduplication/deduplicateNews.js";
import type { Clock } from "../utils/dates.js";
import { createNewsFile } from "./createNewsFile.js";

export function consolidateNews(
  historicalNews: readonly NewsItem[],
  newNews: readonly NewsItem[],
  clock?: Clock,
): NewsFile {
  const uniqueNews = deduplicateNews([...historicalNews, ...newNews]);
  uniqueNews.sort(compareNews);
  return createNewsFile(uniqueNews, clock);
}

function compareNews(left: NewsItem, right: NewsItem): number {
  const leftDate = left.publishedAt ?? left.extractedAt;
  const rightDate = right.publishedAt ?? right.extractedAt;
  const dateDifference = rightDate.localeCompare(leftDate);
  return dateDifference !== 0 ? dateDifference : left.id.localeCompare(right.id);
}
