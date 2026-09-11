import type { NewsFile } from "../domain/newsFile.js";
import { StorageError } from "../errors/StorageError.js";
import type { Logger } from "../utils/logger.js";
import { validateNewsFile } from "../validation/validateNewsFile.js";
import type { NewsStorage } from "../storage/newsStorage.js";

export async function publishNews(
  storage: NewsStorage,
  newsFile: NewsFile,
  logger: Logger,
): Promise<void> {
  let validated: NewsFile;
  try {
    validated = validateNewsFile(newsFile);
  } catch (error) {
    throw new StorageError("El documento final no es válido; no será publicado", { cause: error });
  }

  logger.info("Publicando noticias.json");
  await storage.save(validated);
}
