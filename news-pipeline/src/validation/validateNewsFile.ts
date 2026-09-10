import type { NewsFile } from "../domain/newsFile.js";
import { newsFileSchema } from "./newsSchemas.js";

export function validateNewsFile(input: unknown): NewsFile {
  return newsFileSchema.parse(input);
}
