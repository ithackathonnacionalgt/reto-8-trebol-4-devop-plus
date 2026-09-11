import { SourceError } from "../errors/SourceError.js";
import type { NewsSource } from "./newsSource.js";

export class SourceRegistry {
  private readonly sources = new Map<string, NewsSource>();

  public constructor(sources: readonly NewsSource[] = []) {
    for (const source of sources) {
      this.register(source);
    }
  }

  public register(source: NewsSource): void {
    const normalizedName = source.name.trim();
    if (normalizedName.length === 0) {
      throw new SourceError("Una fuente debe tener un nombre");
    }
    if (this.sources.has(normalizedName)) {
      throw new SourceError(`La fuente ${normalizedName} ya está registrada`);
    }
    this.sources.set(normalizedName, source);
  }

  public list(): NewsSource[] {
    return [...this.sources.values()];
  }
}
