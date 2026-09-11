import type { NewsCandidate } from "../../../domain/newsCandidate.js";
import { SourceError } from "../../../errors/SourceError.js";
import { fetchPage } from "../../../scraping/fetchPage.js";
import { extractText } from "../../../scraping/htmlParser.js";
import type { HttpClient } from "../../../scraping/httpClient.js";
import { normalizeUrl } from "../../../scraping/normalizeUrl.js";
import type { FetchPageOptions } from "../../../scraping/types.js";
import type { Clock } from "../../../utils/dates.js";
import { nowAsIsoString, systemClock } from "../../../utils/dates.js";
import type { NewsSource } from "../../newsSource.js";

export const MINGOB_LISTING_URL = "https://mingob.gob.gt/category/noticias/actualidad/";

export interface MingobSourceOptions {
  listingUrl?: string;
  fetchOptions: FetchPageOptions;
  maxCandidates?: number;
  clock?: Clock;
}

export class MingobNewsSource implements NewsSource {
  public readonly name = "MINGOB";
  private readonly client: HttpClient;
  private readonly options: Required<Omit<MingobSourceOptions, "clock">> & { clock: Clock };

  public constructor(client: HttpClient, options: MingobSourceOptions) {
    this.client = client;
    this.options = {
      listingUrl: options.listingUrl ?? MINGOB_LISTING_URL,
      fetchOptions: options.fetchOptions,
      maxCandidates: options.maxCandidates ?? 30,
      clock: options.clock ?? systemClock,
    };
  }

  public async fetchCandidates(): Promise<NewsCandidate[]> {
    const html = await fetchPage(this.client, this.options.listingUrl, this.options.fetchOptions);
    const candidates = parseMingobListing(
      html,
      nowAsIsoString(this.options.clock),
      this.options.maxCandidates,
    );
    if (candidates.length === 0) {
      throw new SourceError("La página de MINGOB no contiene noticias reconocibles");
    }
    const enriched: NewsCandidate[] = [];
    for (const candidate of candidates) {
      enriched.push(await this.enrichCandidate(candidate));
    }
    return enriched;
  }

  private async enrichCandidate(candidate: NewsCandidate): Promise<NewsCandidate> {
    try {
      const html = await fetchPage(this.client, candidate.originalUrl, this.options.fetchOptions);
      const content = extractArticleContent(html, candidate.rawTitle);
      const imageUrl = extractMetaImage(html, candidate.originalUrl);
      const enriched = { ...candidate };
      if (content.length > candidate.rawContent.length) enriched.rawContent = content;
      if (imageUrl !== undefined) enriched.imageUrl = imageUrl;
      const publishedAt = extractArticleDate(html);
      if (publishedAt !== undefined) enriched.publishedAt = publishedAt;
      return enriched;
    } catch {
      return candidate;
    }
  }
}

export function parseMingobListing(
  html: string,
  extractedAt: string,
  maxCandidates = 30,
): NewsCandidate[] {
  const candidates: NewsCandidate[] = [];
  const headingPattern =
    /<h3\b[^>]*class=["'][^"']*entry-title[^"']*["'][^>]*>\s*<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a\s*>[\s\S]*?<\/h3\s*>/gi;
  const seenUrls = new Set<string>();

  for (const match of html.matchAll(headingPattern)) {
    const href = match[1];
    const titleMarkup = match[2];
    if (href === undefined || titleMarkup === undefined) continue;
    let url: string;
    try {
      url = normalizeUrl(new URL(href, MINGOB_LISTING_URL).toString());
    } catch {
      continue;
    }
    if (!url.startsWith("https://mingob.gob.gt/") || seenUrls.has(url)) continue;
    seenUrls.add(url);
    const rawTitle = extractText(titleMarkup);
    if (rawTitle.length === 0) continue;
    const contextStart = Math.max(0, (match.index ?? 0) - 1800);
    const context = html.slice(contextStart, (match.index ?? 0) + match[0].length + 800);
    const candidate: NewsCandidate = {
      source: "MINGOB",
      sourceType: "news",
      originalUrl: url,
      extractedAt,
      rawTitle,
      rawContent: rawTitle,
    };
    const imageUrl = extractImageUrl(context, url);
    if (imageUrl !== undefined) candidate.imageUrl = imageUrl;
    const publishedAt = parseSpanishDate(context);
    if (publishedAt !== undefined) candidate.publishedAt = publishedAt;
    candidates.push(candidate);
    if (candidates.length >= maxCandidates) break;
  }
  return candidates;
}

function extractImageUrl(context: string, articleUrl: string): string | undefined {
  const match =
    /(?:background-image:\s*url\(['"]?|<img\b[^>]*\bsrc=["'])([^'")\s]+)|data-src=["']([^"']+)["']/i.exec(
      context,
    );
  const value = (match?.[1] ?? match?.[2])?.replaceAll("&quot;", "").trim();
  if (value === undefined) return undefined;
  try {
    return normalizeUrl(new URL(value, articleUrl).toString());
  } catch {
    return undefined;
  }
}

function extractArticleContent(html: string, title: string | undefined): string {
  const paragraphs = [...html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p\s*>/gi)]
    .map((match) => (match[1] === undefined ? "" : extractText(match[1])))
    .filter((text) => text.length >= 30 && text !== title);
  return paragraphs.slice(0, 30).join("\n\n").slice(0, 12000);
}

function extractMetaImage(html: string, articleUrl: string): string | undefined {
  const match =
    /<meta\b[^>]*(?:property|name)=["'](?:og:image|twitter:image)["'][^>]*content=["']([^"']+)["'][^>]*>/i.exec(
      html,
    );
  if (match?.[1] === undefined) return undefined;
  try {
    return normalizeUrl(new URL(match[1], articleUrl).toString());
  } catch {
    return undefined;
  }
}

function extractArticleDate(html: string): string | undefined {
  const match = /<time\b[^>]*datetime=["']([^"']+)["']/i.exec(html);
  if (match?.[1] === undefined) return undefined;
  const date = new Date(match[1]);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function parseSpanishDate(text: string): string | undefined {
  const match = /(\d{1,2})\s+de\s+([a-záéíóú]+)\s+de\s+(\d{4})/i.exec(extractText(text));
  if (match?.[1] === undefined || match[2] === undefined || match[3] === undefined)
    return undefined;
  const months: Record<string, number> = {
    enero: 0,
    febrero: 1,
    marzo: 2,
    abril: 3,
    mayo: 4,
    junio: 5,
    julio: 6,
    agosto: 7,
    septiembre: 8,
    octubre: 9,
    noviembre: 10,
    diciembre: 11,
  };
  const month =
    months[
      match[2]
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
    ];
  if (month === undefined) return undefined;
  return new Date(Date.UTC(Number(match[3]), month, Number(match[1]))).toISOString();
}
