import type { NewsCandidate } from "../../../domain/newsCandidate.js";
import { SourceError } from "../../../errors/SourceError.js";
import type { Clock } from "../../../utils/dates.js";
import { nowAsIsoString, systemClock } from "../../../utils/dates.js";
import { fetchPage } from "../../../scraping/fetchPage.js";
import { extractText } from "../../../scraping/htmlParser.js";
import type { HttpClient } from "../../../scraping/httpClient.js";
import { normalizeUrl } from "../../../scraping/normalizeUrl.js";
import type { FetchPageOptions } from "../../../scraping/types.js";
import type { NewsSource } from "../../newsSource.js";

export const MSPAS_LISTING_URL = "https://www.mspas.gob.gt/noticias-mspas";

export interface MspasSourceOptions {
  listingUrl?: string;
  fetchOptions: FetchPageOptions;
  maxCandidates?: number;
  clock?: Clock;
}

export class MspasNewsSource implements NewsSource {
  public readonly name = "MSPAS";
  private readonly client: HttpClient;
  private readonly options: Required<Omit<MspasSourceOptions, "clock">> & { clock: Clock };

  public constructor(client: HttpClient, options: MspasSourceOptions) {
    this.client = client;
    this.options = {
      listingUrl: options.listingUrl ?? MSPAS_LISTING_URL,
      fetchOptions: options.fetchOptions,
      maxCandidates: options.maxCandidates ?? 30,
      clock: options.clock ?? systemClock,
    };
  }

  public async fetchCandidates(): Promise<NewsCandidate[]> {
    const html = await fetchPage(this.client, this.options.listingUrl, this.options.fetchOptions);
    const extractedAt = nowAsIsoString(this.options.clock);
    const candidates = parseMspasListing(html, extractedAt, this.options.maxCandidates);

    if (candidates.length === 0) {
      throw new SourceError(
        "La página de MSPAS no contiene comunicados o notas de salud reconocibles",
      );
    }

    return candidates;
  }
}

export function parseMspasListing(
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

    const url = resolveMspasUrl(titleLink.href);
    const title = extractText(titleLink.text);
    const blockText = extractText(block);
    const rawContent = blockText.startsWith(title)
      ? blockText.slice(title.length).trim()
      : blockText;

    const candidate: NewsCandidate = {
      source: "MSPAS",
      sourceType: "news",
      originalUrl: url,
      extractedAt,
      rawTitle: title,
      rawContent: rawContent || title,
    };

    const imageUrl = extractImageUrl(block, url);
    if (imageUrl !== undefined) {
      candidate.imageUrl = imageUrl;
    }

    const sourceId = sourceIdFromUrl(url);
    if (sourceId !== undefined) {
      candidate.sourceId = sourceId;
    }

    const publishedAt = parseDate(block);
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

function resolveMspasUrl(value: string): string {
  try {
    return normalizeUrl(new URL(value, MSPAS_LISTING_URL).toString());
  } catch (error) {
    throw new SourceError("MSPAS devolvió un enlace de nota inválido", { cause: error });
  }
}

function sourceIdFromUrl(url: string): string | undefined {
  const parsed = new URL(url);
  const wordpressId = parsed.searchParams.get("p");
  if (wordpressId !== null && wordpressId.length > 0) {
    return `post-${wordpressId}`;
  }
  const pathname = parsed.pathname.replace(/\/+$/, "");
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
  setiembre: 8,
  octubre: 9,
  noviembre: 10,
  diciembre: 11,
};

function parseDate(block: string): string | undefined {
  const isoMatch = /\bdatetime\s*=\s*["'](\d{4}-\d{2}-\d{2}(?:T[^"']*)?)["']/i.exec(block);
  if (isoMatch?.[1]) {
    const parsedDate = new Date(isoMatch[1]);
    if (!Number.isNaN(parsedDate.getTime())) {
      return parsedDate.toISOString();
    }
  }

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
