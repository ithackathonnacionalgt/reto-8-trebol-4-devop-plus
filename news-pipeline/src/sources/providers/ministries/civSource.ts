import type { NewsCandidate } from "../../../domain/newsCandidate.js";
import type { HttpClient } from "../../../scraping/httpClient.js";
import { MineducNewsSource, type MineducSourceOptions, parseListing } from "./mineducSource.js";

export const CIV_LISTING_URL = "https://www.civ.gob.gt/web/guest/inicio";
export interface CivSourceOptions extends MineducSourceOptions { listingUrl?: string; }
export class CivNewsSource extends MineducNewsSource {
  public override readonly name = "CIV";
  public constructor(client: HttpClient, options: CivSourceOptions) { super(client, { ...options, listingUrl: options.listingUrl ?? CIV_LISTING_URL }); }
  protected override parseListing(html: string, extractedAt: string, maxCandidates: number): NewsCandidate[] { return parseListing(html, extractedAt, maxCandidates, "CIV", "https://www.civ.gob.gt/", CIV_LISTING_URL); }
}
