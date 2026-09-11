export interface NewsCandidate {
  source: string;
  sourceType: string;
  originalUrl: string;
  sourceId?: string;
  publishedAt?: string;
  extractedAt: string;
  rawTitle?: string;
  imageUrl?: string;
  rawContent: string;
}
