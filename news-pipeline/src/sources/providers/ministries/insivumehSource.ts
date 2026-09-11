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

export const INSIVUMEH_LISTING_URL = "https://insivumeh.gob.gt/category/noticias/";

export interface InsivumehSourceOptions {
  listingUrl?: string;
  fetchOptions: FetchPageOptions;
  maxCandidates?: number;
  clock?: Clock;
}

export class InsivumehNewsSource implements NewsSource {
  public readonly name = "INSIVUMEH";
  private readonly client: HttpClient;
  private readonly options: Required<Omit<InsivumehSourceOptions, "clock">> & { clock: Clock };

  public constructor(client: HttpClient, options: InsivumehSourceOptions) {
    this.client = client;
    this.options = {
      listingUrl: options.listingUrl ?? INSIVUMEH_LISTING_URL,
      fetchOptions: options.fetchOptions,
      maxCandidates: options.maxCandidates ?? 30,
      clock: options.clock ?? systemClock,
    };
  }

  public async fetchCandidates(): Promise<NewsCandidate[]> {
    const html = await fetchPage(this.client, this.options.listingUrl, this.options.fetchOptions);
    const candidates = parseInsivumehListing(html, nowAsIsoString(this.options.clock), this.options.maxCandidates);
    if (candidates.length === 0) throw new SourceError("La página de INSIVUMEH no contiene noticias reconocibles");
    const enriched: NewsCandidate[] = [];
    for (const candidate of candidates) enriched.push(await this.enrichCandidate(candidate));
    return enriched;
  }

  private async enrichCandidate(candidate: NewsCandidate): Promise<NewsCandidate> {
    try {
      const html = await fetchPage(this.client, candidate.originalUrl, this.options.fetchOptions);
      const content = extractArticleContent(html, candidate.rawTitle);
      const result = { ...candidate };
      if (content.length > candidate.rawContent.length) result.rawContent = content;
      const image = extractMetaImage(html, candidate.originalUrl);
      if (image !== undefined) result.imageUrl = image;
      const date = extractArticleDate(html);
      if (date !== undefined) result.publishedAt = date;
      return result;
    } catch {
      return candidate;
    }
  }
}

export function parseInsivumehListing(html: string, extractedAt: string, maxCandidates = 30): NewsCandidate[] {
  const result: NewsCandidate[] = [];
  const seen = new Set<string>();
  // INSIVUMEH uses WordPress templates whose title element has varied between h2/h3/h4.
  const pattern = /<h[2-4]\b[^>]*>\s*<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a\s*>[\s\S]*?<\/h[2-4]\s*>/gi;
  for (const match of html.matchAll(pattern)) {
    const href = match[1];
    const titleMarkup = match[2];
    if (href === undefined || titleMarkup === undefined) continue;
    let url: string;
    try { url = normalizeUrl(new URL(href, INSIVUMEH_LISTING_URL).toString()); } catch { continue; }
    if (!url.startsWith("https://insivumeh.gob.gt/") || seen.has(url) || url === INSIVUMEH_LISTING_URL) continue;
    const title = extractText(titleMarkup);
    if (title.length < 10) continue;
    seen.add(url);
    const start = Math.max(0, (match.index ?? 0) - 1500);
    const context = html.slice(start, (match.index ?? 0) + match[0].length + 700);
    const candidate: NewsCandidate = { source: "INSIVUMEH", sourceType: "news", originalUrl: url, extractedAt, rawTitle: title, rawContent: title };
    const image = extractImage(context, url);
    if (image !== undefined) candidate.imageUrl = image;
    const date = parseSpanishDate(context);
    if (date !== undefined) candidate.publishedAt = date;
    result.push(candidate);
    if (result.length >= maxCandidates) break;
  }
  return result;
}

function extractArticleContent(html: string, title: string | undefined): string {
  return [...html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p\s*>/gi)]
    .map((m) => extractText(m[1] ?? ""))
    .filter((text) => text.length >= 30 && text !== title)
    .slice(0, 40).join("\n\n").slice(0, 14000);
}

function extractMetaImage(html: string, articleUrl: string): string | undefined {
  const value = /<meta\b[^>]*(?:property|name)=["'](?:og:image|twitter:image)["'][^>]*content=["']([^"']+)["'][^>]*>/i.exec(html)?.[1];
  return value === undefined ? undefined : toUrl(value, articleUrl);
}

function extractImage(text: string, articleUrl: string): string | undefined {
  const value = /(?:<img\b[^>]*(?:src|data-src)=["']([^"']+)|background-image:\s*url\(['"]?([^'")\s]+))/i.exec(text);
  return toUrl(value?.[1] ?? value?.[2], articleUrl);
}

function toUrl(value: string | undefined, base: string): string | undefined {
  if (value === undefined) return undefined;
  try { return normalizeUrl(new URL(value.replaceAll("&quot;", ""), base).toString()); } catch { return undefined; }
}

function extractArticleDate(html: string): string | undefined {
  const value = /<time\b[^>]*datetime=["']([^"']+)["']/i.exec(html)?.[1];
  if (value === undefined) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function parseSpanishDate(text: string): string | undefined {
  const match = /(\d{1,2})\s+de\s+([a-záéíóú]+)\s+de\s+(\d{4})/i.exec(extractText(text));
  if (match?.[1] === undefined || match[2] === undefined || match[3] === undefined) return undefined;
  const months: Record<string, number> = { enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5, julio: 6, agosto: 7, septiembre: 8, octubre: 9, noviembre: 10, diciembre: 11 };
  const month = months[match[2].normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()];
  return month === undefined ? undefined : new Date(Date.UTC(Number(match[3]), month, Number(match[1]))).toISOString();
}
