import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { CATEGORIES } from "../../../src/domain/categories.js";
import { LocalNewsStorage } from "../../../src/storage/localNewsStorage.js";

const validNewsFile = {
  lastUpdatedAt: "2026-09-10T12:00:00Z",
  totalNews: 0,
  availableCategories: [...CATEGORIES],
  news: [],
};

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true })),
  );
});

async function temporaryPath(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "government-news-pipeline-"));
  temporaryDirectories.push(directory);
  return join(directory, "nested", "noticias.json");
}

describe("LocalNewsStorage", () => {
  it("returns null when the historical file does not exist", async () => {
    await expect(new LocalNewsStorage(await temporaryPath()).load()).resolves.toBeNull();
  });

  it("saves atomically and loads a validated document", async () => {
    const path = await temporaryPath();
    const storage = new LocalNewsStorage(path);

    await storage.save(validNewsFile);

    await expect(storage.load()).resolves.toEqual(validNewsFile);
    await expect(readFile(path, "utf8")).resolves.toContain('"totalNews": 0');
  });

  it("rejects invalid historical JSON", async () => {
    const path = await temporaryPath();
    await mkdir(path.slice(0, path.lastIndexOf("/")), { recursive: true });
    await writeFile(path, "{invalid", "utf8");

    await expect(new LocalNewsStorage(path).load()).rejects.toThrow("no contiene JSON válido");
  });

  it("does not write an invalid document", async () => {
    const path = await temporaryPath();
    const invalid = { ...validNewsFile, totalNews: 1 };

    await expect(new LocalNewsStorage(path).save(invalid)).rejects.toThrow("No se guardará");
  });
});
