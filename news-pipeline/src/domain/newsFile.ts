import type { Category } from "./categories.js";
import type { NewsItem } from "./news.js";

export interface NewsFile {
  lastUpdatedAt: string;
  totalNews: number;
  availableCategories: Category[];
  news: NewsItem[];
}
