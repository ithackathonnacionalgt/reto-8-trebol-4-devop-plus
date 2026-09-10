import type { NewsCandidate } from "../domain/newsCandidate.js";
import { hash } from "../utils/hash.js";
import { normalizeUrl } from "../scraping/normalizeUrl.js";

const normalizeText = (value: string | undefined): string =>
  value?.trim().toLocaleLowerCase().replace(/\s+/g, " ") ?? "";

const sourceSlug = (source: string): string => {
  const slug = normalizeText(source)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || "source";
};

export function buildNewsFingerprint(candidate: NewsCandidate): string {
  const fingerprintInput = {
    source: normalizeText(candidate.source),
    sourceType: normalizeText(candidate.sourceType),
    originalUrl: normalizeUrl(candidate.originalUrl),
    publishedAt: candidate.publishedAt ?? null,
    rawTitle: normalizeText(candidate.rawTitle),
    rawContent: normalizeText(candidate.rawContent),
  };

  return hash(JSON.stringify(fingerprintInput));
}

export function buildNewsId(candidate: NewsCandidate): string {
  const source = sourceSlug(candidate.source);
  const sourceId = candidate.sourceId?.trim();
  if (sourceId) {
    const stableSourceId = sourceId.toLocaleLowerCase().replace(/[^a-z0-9]+/g, "-");
    return `${source}-${stableSourceId.replace(/^-|-$/g, "")}`;
  }

  const normalizedUrl = normalizeUrl(candidate.originalUrl);
  return `${source}-${hash(normalizedUrl).slice(0, 16)}`;
}

export function buildCandidateIdentityKeys(candidate: NewsCandidate): string[] {
  const keys = [`url:${normalizeUrl(candidate.originalUrl)}`];
  if (candidate.sourceId?.trim()) {
    keys.push(`source-id:${normalizeText(candidate.source)}:${candidate.sourceId.trim()}`);
  }
  keys.push(`fingerprint:${buildNewsFingerprint(candidate)}`);
  keys.push(`id:${buildNewsId(candidate)}`);
  return keys;
}
