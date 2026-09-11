import type { NewsItem } from "../domain/news.js";

export function deduplicateNews(news: readonly NewsItem[]): NewsItem[] {
  const seenIds = new Set<string>();
  const seenUrls = new Set<string>();
  const result: NewsItem[] = [];

  for (const newsItem of news) {
    if (seenIds.has(newsItem.id) || seenUrls.has(newsItem.originalUrl)) {
      continue;
    }

    seenIds.add(newsItem.id);
    seenUrls.add(newsItem.originalUrl);
    result.push({
      ...newsItem,
      tags: [...newsItem.tags],
      content: {
        es: { ...newsItem.content.es },
        quc: { ...newsItem.content.quc },
      },
    });
  }

  return result;
}
