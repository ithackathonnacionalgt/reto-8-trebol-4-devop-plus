import type { CategoryId } from "./categories.js";

export interface LocalizedNewsContent {
  title: string;
  summary: string;
  citizenAction: string;
}

export interface NewsItem {
  id: string;
  originalUrl: string;
  imageUrl?: string;
  source: string;
  sourceType: string;
  categoryId: CategoryId;
  tags: string[];
  publishedAt: string | null;
  extractedAt: string;
  urgent: boolean;
  content: {
    es: LocalizedNewsContent;
    quc: LocalizedNewsContent;
  };
}
