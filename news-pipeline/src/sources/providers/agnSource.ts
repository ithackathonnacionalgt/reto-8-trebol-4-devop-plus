import type { NewsCandidate } from "../../domain/newsCandidate.js";
import { SourceError } from "../../errors/SourceError.js";
import type { Clock } from "../../utils/dates.js";
import { nowAsIsoString, systemClock } from "../../utils/dates.js";
import { fetchPage } from "../../scraping/fetchPage.js";
import { extractText } from "../../scraping/htmlParser.js";
import type { HttpClient } from "../../scraping/httpClient.js";
import { normalizeUrl } from "../../scraping/normalizeUrl.js";
import type { FetchPageOptions } from "../../scraping/types.js";
import type { NewsSource } from "../newsSource.js";

export const AGN_LISTING_URL = "https://agn.gt/ultimas-noticias/";

export interface AgnSourceOptions {
  listingUrl?: string;
  fetchOptions: FetchPageOptions;
  maxCandidates?: number;
  clock?: Clock;
}

export class AgnNewsSource implements NewsSource {
  public readonly name = "AGN";
  private readonly client: HttpClient;
  private readonly options: Required<Omit<AgnSourceOptions, "clock">> & { clock: Clock };

  public constructor(client: HttpClient, options: AgnSourceOptions) {
    this.client = client;
    this.options = {
      listingUrl: options.listingUrl ?? AGN_LISTING_URL,
      fetchOptions: options.fetchOptions,
      maxCandidates: options.maxCandidates ?? 30,
      clock: options.clock ?? systemClock,
    };
  }

  public async fetchCandidates(): Promise<NewsCandidate[]> {
    const html = await fetchPage(this.client, this.options.listingUrl, this.options.fetchOptions);
    const extractedAt = nowAsIsoString(this.options.clock);
    const candidates = parseAgnListing(html, extractedAt, this.options.maxCandidates);

    if (candidates.length === 0) {
      throw new SourceError("La página de AGN no contiene artículos reconocibles");
    }

    return candidates;
  }
}

export function parseAgnListing(
  html: string,
  extractedAt: string,
  maxCandidates = 30,
): NewsCandidate[] {
  const candidates: NewsCandidate[] = [];
  const articlePattern = /<article\b[^>]*>([\s\S]*?)<\/article\s*>/gi;

  for (const match of html.matchAll(articlePattern)) {
    const block = match[1];
    if (block === undefined) {
      continue;
    }

    const titleLink = firstTitleLink(block);
    if (titleLink === undefined) {
      continue;
    }

    const url = resolveAgnUrl(titleLink.href);
    const title = extractText(titleLink.text);
    const blockText = extractText(block);
    const rawContent = blockText.startsWith(title)
      ? blockText.slice(title.length).trim()
      : blockText;

    const candidate: NewsCandidate = {
      source: "AGN",
      sourceType: "news",
      originalUrl: url,
      extractedAt,
      rawTitle: title,
      rawContent: rawContent || title,
    };
    const imageUrl = extractImageUrl(block, url);
    if (imageUrl !== undefined) candidate.imageUrl = imageUrl;
    const sourceId = sourceIdFromUrl(url);
    if (sourceId !== undefined) {
      candidate.sourceId = sourceId;
    }
    const publishedAt = parseSpanishDate(block);
    if (publishedAt !== undefined) {
      candidate.publishedAt = publishedAt;
    }
    candidates.push(candidate);

    if (candidates.length >= maxCandidates) {
      break;
    }
  }

  return candidates;
}

function extractImageUrl(block: string, articleUrl: string): string | undefined {
  const match = /<img\b[^>]*(?:src|data-src)\s*=\s*["']([^"']+)["'][^>]*>/i.exec(block);
  if (match?.[1] === undefined) return undefined;
  try {
    return normalizeUrl(new URL(match[1], articleUrl).toString());
  } catch {
    return undefined;
  }
}

interface TitleLink {
  href: string;
  text: string;
}

function firstTitleLink(block: string): TitleLink | undefined {
  const headingPattern =
    /<h[1-6]\b[^>]*>[\s\S]*?<a\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a\s*>[\s\S]*?<\/h[1-6]\s*>/i;
  const match = headingPattern.exec(block);
  if (match?.[1] === undefined || match[2] === undefined) {
    return undefined;
  }
  return { href: match[1], text: match[2] };
}

function resolveAgnUrl(value: string): string {
  try {
    return normalizeUrl(new URL(value, AGN_LISTING_URL).toString());
  } catch (error) {
    throw new SourceError("AGN devolvió un enlace de noticia inválido", { cause: error });
  }
}

function sourceIdFromUrl(url: string): string | undefined {
  const pathname = new URL(url).pathname.replace(/\/+$/, "");
  const lastSegment = pathname.split("/").at(-1);
  return lastSegment === undefined || lastSegment.length === 0 ? undefined : lastSegment;
}

const SPANISH_MONTHS: Record<string, number> = {
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

function parseSpanishDate(block: string): string | undefined {
  const text = extractText(block).toLocaleLowerCase();
  const match = /(\d{1,2})\s+de\s+([a-záéíóú]+)\s+de\s+(\d{4})/.exec(text);
  if (match?.[1] === undefined || match[2] === undefined || match[3] === undefined) {
    return undefined;
  }

  const monthName = match[2].normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const month = SPANISH_MONTHS[monthName];
  if (month === undefined) {
    return undefined;
  }

  return new Date(Date.UTC(Number(match[3]), month, Number(match[1]))).toISOString();
}
