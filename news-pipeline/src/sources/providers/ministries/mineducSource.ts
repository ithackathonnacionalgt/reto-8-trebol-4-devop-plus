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

export const MINEDUC_LISTING_URL = "https://www.mineduc.gob.gt/MINEDUC/es/inicio";

export interface MineducSourceOptions { listingUrl?: string; fetchOptions: FetchPageOptions; maxCandidates?: number; clock?: Clock; }

export class MineducNewsSource implements NewsSource {
  public readonly name: string = "MINEDUC";
  private readonly client: HttpClient;
  private readonly options: Required<Omit<MineducSourceOptions, "clock">> & { clock: Clock };
  public constructor(client: HttpClient, options: MineducSourceOptions) {
    this.client = client;
    this.options = { listingUrl: options.listingUrl ?? MINEDUC_LISTING_URL, fetchOptions: options.fetchOptions, maxCandidates: options.maxCandidates ?? 30, clock: options.clock ?? systemClock };
  }
  public async fetchCandidates(): Promise<NewsCandidate[]> {
    const html = await fetchPage(this.client, this.options.listingUrl, this.options.fetchOptions);
    const candidates = this.parseListing(html, nowAsIsoString(this.options.clock), this.options.maxCandidates);
    if (candidates.length === 0) throw new SourceError("La página de MINEDUC no contiene noticias reconocibles");
    const enriched: NewsCandidate[] = [];
    for (const candidate of candidates) enriched.push(await this.enrich(candidate));
    return enriched;
  }
  protected parseListing(html: string, extractedAt: string, maxCandidates: number): NewsCandidate[] {
    return parseMineducListing(html, extractedAt, maxCandidates);
  }
  private async enrich(candidate: NewsCandidate): Promise<NewsCandidate> {
    try {
      const html = await fetchPage(this.client, candidate.originalUrl, this.options.fetchOptions);
      const paragraphs = [...html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p\s*>/gi)].map((m) => extractText(m[1] ?? "")).filter((t) => t.length >= 30 && t !== candidate.rawTitle).slice(0, 40).join("\n\n").slice(0, 14000);
      const result = { ...candidate };
      if (paragraphs.length > candidate.rawContent.length) result.rawContent = paragraphs;
      const image = /<meta\b[^>]*(?:property|name)=["'](?:og:image|twitter:image)["'][^>]*content=["']([^"']+)["'][^>]*>/i.exec(html)?.[1];
      if (image !== undefined) { try { result.imageUrl = normalizeUrl(new URL(image, candidate.originalUrl).toString()); } catch { /* ignore malformed image */ } }
      const datetime = /<time\b[^>]*datetime=["']([^"']+)["']/i.exec(html)?.[1];
      if (datetime !== undefined && !Number.isNaN(new Date(datetime).getTime())) result.publishedAt = new Date(datetime).toISOString();
      return result;
    } catch { return candidate; }
  }
}

export function parseMineducListing(html: string, extractedAt: string, maxCandidates = 30): NewsCandidate[] {
  return parseListing(html, extractedAt, maxCandidates, "MINEDUC", "https://www.mineduc.gob.gt/", MINEDUC_LISTING_URL);
}

export function parseListing(html: string, extractedAt: string, maxCandidates: number, source: string, base: string, listing: string): NewsCandidate[] {
  const result: NewsCandidate[] = []; const seen = new Set<string>();
  const pattern = /<h[2-4]\b[^>]*>\s*<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a\s*>[\s\S]*?<\/h[2-4]\s*>/gi;
  for (const match of html.matchAll(pattern)) {
    const href = match[1]; const titleMarkup = match[2]; if (href === undefined || titleMarkup === undefined) continue;
    let url: string; try { url = normalizeUrl(new URL(href, listing).toString()); } catch { continue; }
    if (!url.startsWith(base) || seen.has(url) || url === normalizeUrl(listing)) continue;
    const title = extractText(titleMarkup); if (title.length < 10) continue; seen.add(url);
    const context = html.slice(Math.max(0, (match.index ?? 0) - 1400), (match.index ?? 0) + match[0].length + 700);
    const candidate: NewsCandidate = { source, sourceType: "news", originalUrl: url, extractedAt, rawTitle: title, rawContent: title };
    const image = /(?:<img\b[^>]*(?:src|data-src)=["']([^"']+)|background-image:\s*url\(['"]?([^'")\s]+))/i.exec(context)?.[1] ?? /(?:<img\b[^>]*(?:src|data-src)=["']([^"']+)|background-image:\s*url\(['"]?([^'")\s]+))/i.exec(context)?.[2];
    if (image !== undefined) { try { candidate.imageUrl = normalizeUrl(new URL(image, url).toString()); } catch { /* ignore */ } }
    result.push(candidate); if (result.length >= maxCandidates) break;
  }
  return result;
}
