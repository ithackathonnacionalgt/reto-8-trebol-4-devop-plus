import type { NewsCandidate } from "../../../domain/newsCandidate.js";
import type { HttpClient } from "../../../scraping/httpClient.js";
import { MineducNewsSource, type MineducSourceOptions, parseListing } from "./mineducSource.js";

export const MARN_LISTING_URL = "https://marn.gob.gt/category/noticias/";
export interface MarnSourceOptions extends Omit<MineducSourceOptions, "listingUrl"> { listingUrl?: string; }

export class MarnNewsSource extends MineducNewsSource {
  public override readonly name = "MARN";
  public constructor(client: HttpClient, options: MarnSourceOptions) {
    super(client, { ...options, listingUrl: options.listingUrl ?? MARN_LISTING_URL });
  }
  protected override parseListing(html: string, extractedAt: string, maxCandidates: number): NewsCandidate[] {
    return parseMarnListing(html, extractedAt, maxCandidates);
  }
}

export function parseMarnListing(html: string, extractedAt: string, maxCandidates = 30): NewsCandidate[] {
  return parseListing(html, extractedAt, maxCandidates, "MARN", "https://marn.gob.gt/", MARN_LISTING_URL);
}
