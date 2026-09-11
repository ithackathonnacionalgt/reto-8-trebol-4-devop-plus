import type { NewsCandidate } from "../../../domain/newsCandidate.js";
import type { HttpClient } from "../../../scraping/httpClient.js";
import { MineducNewsSource, type MineducSourceOptions, parseListing } from "./mineducSource.js";

export const SAT_LISTING_URL = "https://portal.sat.gob.gt/portal/categoria/noticias/";
export interface SatSourceOptions extends MineducSourceOptions { listingUrl?: string; }
export class SatNewsSource extends MineducNewsSource {
  public override readonly name = "SAT";
  public constructor(client: HttpClient, options: SatSourceOptions) { super(client, { ...options, listingUrl: options.listingUrl ?? SAT_LISTING_URL }); }
  protected override parseListing(html: string, extractedAt: string, maxCandidates: number): NewsCandidate[] { return parseListing(html, extractedAt, maxCandidates, "SAT", "https://portal.sat.gob.gt/", SAT_LISTING_URL); }
}
