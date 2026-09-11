import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import type { NewsFile } from "../domain/newsFile.js";
import { StorageError } from "../errors/StorageError.js";
import { validateNewsFile } from "../validation/validateNewsFile.js";
import type { NewsStorage } from "./newsStorage.js";

export class LocalNewsStorage implements NewsStorage {
  private readonly filePath: string;

  public constructor(filePath: string) {
    this.filePath = filePath;
  }

  public async load(): Promise<NewsFile | null> {
    let serialized: string;
    try {
      serialized = await readFile(this.filePath, "utf8");
    } catch (error) {
      if (isFileNotFound(error)) {
        return null;
      }
      throw new StorageError("No fue posible descargar el archivo histórico local", {
        cause: error,
      });
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(serialized) as unknown;
    } catch (error) {
      throw new StorageError("El archivo histórico local no contiene JSON válido", {
        cause: error,
      });
    }

    try {
      return validateNewsFile(parsed);
    } catch (error) {
      throw new StorageError("El archivo histórico local no cumple el esquema esperado", {
        cause: error,
      });
    }
  }

  public async save(newsFile: NewsFile): Promise<void> {
    let validated: NewsFile;
    try {
      validated = validateNewsFile(newsFile);
    } catch (error) {
      throw new StorageError("No se guardará un archivo de noticias inválido", { cause: error });
    }

    const serialized = `${JSON.stringify(validated, null, 2)}\n`;
    const temporaryPath = `${this.filePath}.tmp-${process.pid}`;

    try {
      await mkdir(dirname(this.filePath), { recursive: true });
      await writeFile(temporaryPath, serialized, "utf8");
      await rename(temporaryPath, this.filePath);
    } catch (error) {
      throw new StorageError("No fue posible guardar el archivo histórico local", { cause: error });
    }
  }
}

function isFileNotFound(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}
