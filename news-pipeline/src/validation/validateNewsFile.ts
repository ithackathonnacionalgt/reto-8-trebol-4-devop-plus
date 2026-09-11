import type { NewsFile } from "../domain/newsFile.js";
import { ValidationError } from "../errors/ValidationError.js";
import { newsFileSchema } from "./newsSchemas.js";

export function validateNewsFile(input: unknown): NewsFile {
  const result = newsFileSchema.safeParse(input);

  if (!result.success) {
    throw new ValidationError("El archivo de noticias no tiene una estructura válida", {
      cause: result.error,
    });
  }

  return result.data as NewsFile;
}
