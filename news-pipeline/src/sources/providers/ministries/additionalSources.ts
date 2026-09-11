import type { NewsCandidate } from "../../../domain/newsCandidate.js";
import type { HttpClient } from "../../../scraping/httpClient.js";
import { MineducNewsSource, type MineducSourceOptions, parseListing } from "./mineducSource.js";

interface AdditionalOptions extends MineducSourceOptions { listingUrl?: string; }

class AdditionalNewsSource extends MineducNewsSource {
  public constructor(client: HttpClient, options: AdditionalOptions, name: string, listing: string, host: string) {
    super(client, { ...options, listingUrl: options.listingUrl ?? listing });
    this.name = name;
    this.host = host;
    this.listing = listing;
  }
  public override name: string;
  private readonly host: string;
  private readonly listing: string;
  protected override parseListing(html: string, extractedAt: string, maxCandidates: number): NewsCandidate[] {
    return parseListing(html, extractedAt, maxCandidates, this.name, this.host, this.listing);
  }
}

export const MAGA_LISTING_URL = "https://www.maga.gob.gt/category/noticias/";
export class MagaNewsSource extends AdditionalNewsSource {
  public constructor(client: HttpClient, options: AdditionalOptions) { super(client, options, "MAGA", MAGA_LISTING_URL, "https://www.maga.gob.gt/"); }
}

export const MIDES_LISTING_URL = "https://www.mides.gob.gt/noticias/";
export class MidesNewsSource extends AdditionalNewsSource {
  public constructor(client: HttpClient, options: AdditionalOptions) { super(client, options, "MIDES", MIDES_LISTING_URL, "https://www.mides.gob.gt/"); }
}

export const INAB_LISTING_URL = "https://www.inab.gob.gt/index.php/noticias/";
export class InabNewsSource extends AdditionalNewsSource {
  public constructor(client: HttpClient, options: AdditionalOptions) { super(client, options, "INAB", INAB_LISTING_URL, "https://www.inab.gob.gt/"); }
}

export const CONADI_LISTING_URL = "https://www.conadi.gob.gt/web/noticias/";
export class ConadiNewsSource extends AdditionalNewsSource {
  public constructor(client: HttpClient, options: AdditionalOptions) { super(client, options, "CONADI", CONADI_LISTING_URL, "https://www.conadi.gob.gt/"); }
}

export const PDH_LISTING_URL = "https://www.pdh.org.gt/noticias/";
export class PdhNewsSource extends AdditionalNewsSource {
  public constructor(client: HttpClient, options: AdditionalOptions) { super(client, options, "PDH", PDH_LISTING_URL, "https://www.pdh.org.gt/"); }
}
