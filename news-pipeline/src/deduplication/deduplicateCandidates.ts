import type { NewsCandidate } from "../domain/newsCandidate.js";
import type { NewsItem } from "../domain/news.js";
import { normalizeUrl } from "../scraping/normalizeUrl.js";
import { buildCandidateIdentityKeys } from "./buildNewsFingerprint.js";

export interface CandidateDeduplicationResult {
  candidates: NewsCandidate[];
  duplicateCount: number;
}

const historicalKeys = (news: NewsItem): Set<string> =>
  new Set([`url:${normalizeUrl(news.originalUrl)}`, `id:${news.id}`]);

export function deduplicateCandidates(
  candidates: readonly NewsCandidate[],
  historicalNews: readonly NewsItem[],
): CandidateDeduplicationResult {
  const knownKeys = new Set<string>();
  for (const newsItem of historicalNews) {
    for (const key of historicalKeys(newsItem)) {
      knownKeys.add(key);
    }
  }

  const newCandidates: NewsCandidate[] = [];
  let duplicateCount = 0;

  for (const candidate of candidates) {
    const keys = buildCandidateIdentityKeys(candidate);
    if (keys.some((key) => knownKeys.has(key))) {
      duplicateCount += 1;
      continue;
    }

    newCandidates.push({ ...candidate });
    for (const key of keys) {
      knownKeys.add(key);
    }
  }

  return { candidates: newCandidates, duplicateCount };
}
