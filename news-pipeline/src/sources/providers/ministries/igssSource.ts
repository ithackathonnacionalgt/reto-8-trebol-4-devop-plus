import type { NewsCandidate } from "../../../domain/newsCandidate.js";
import type { HttpClient } from "../../../scraping/httpClient.js";
import { MineducNewsSource, type MineducSourceOptions, parseListing } from "./mineducSource.js";

export const IGSS_LISTING_URL = "https://www.igssgt.org/noticias/";
export interface IgssSourceOptions extends MineducSourceOptions { listingUrl?: string; }
export class IgssNewsSource extends MineducNewsSource {
  public override readonly name = "IGSS";
  public constructor(client: HttpClient, options: IgssSourceOptions) { super(client, { ...options, listingUrl: options.listingUrl ?? IGSS_LISTING_URL }); }
  protected override parseListing(html: string, extractedAt: string, maxCandidates: number): NewsCandidate[] { return parseListing(html, extractedAt, maxCandidates, "IGSS", "https://www.igssgt.org/", IGSS_LISTING_URL); }
}
