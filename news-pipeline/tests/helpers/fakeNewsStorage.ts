import type { NewsFile } from "../../src/domain/newsFile.js";
import type { NewsStorage } from "../../src/storage/newsStorage.js";

export class FakeNewsStorage implements NewsStorage {
  public savedNewsFile: NewsFile | undefined;
  public loadCalls = 0;
  public saveCalls = 0;
  private readonly initialNewsFile: NewsFile | null;
  private readonly loadError: Error | undefined;
  private readonly saveError: Error | undefined;

  public constructor(
    initialNewsFile: NewsFile | null = null,
    options: { loadError?: Error; saveError?: Error } = {},
  ) {
    this.initialNewsFile = initialNewsFile;
    this.loadError = options.loadError;
    this.saveError = options.saveError;
  }

  public async load(): Promise<NewsFile | null> {
    this.loadCalls += 1;
    if (this.loadError !== undefined) {
      throw this.loadError;
    }
    return this.initialNewsFile;
  }

  public async save(newsFile: NewsFile): Promise<void> {
    this.saveCalls += 1;
    if (this.saveError !== undefined) {
      throw this.saveError;
    }
    this.savedNewsFile = newsFile;
  }
}
