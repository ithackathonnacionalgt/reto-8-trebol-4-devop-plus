import type { NewsFile } from "../domain/newsFile.js";

export interface NewsStorage {
  load(): Promise<NewsFile | null>;
  save(newsFile: NewsFile): Promise<void>;
}
