import { describe, expect, it } from "vitest";

import { CATEGORIES } from "../../../src/domain/categories.js";
import { R2NewsStorage } from "../../../src/storage/r2NewsStorage.js";

const config = {
  accountId: "account",
  accessKeyId: "access",
  secretAccessKey: "secret",
  bucketName: "news-bucket",
  objectKey: "noticias.json",
};

const validNewsFile = {
  lastUpdatedAt: "2026-09-10T12:00:00Z",
  totalNews: 0,
  availableCategories: [...CATEGORIES],
  news: [],
};

describe("R2NewsStorage", () => {
  it("loads an existing validated object", async () => {
    const client = {
      send: async () => ({
        Body: { transformToString: async () => JSON.stringify(validNewsFile) },
      }),
    };

    await expect(new R2NewsStorage(config, client).load()).resolves.toEqual(validNewsFile);
  });

  it("returns null only for a missing object", async () => {
    const client = {
      send: async () => {
        throw Object.assign(new Error("missing"), { name: "NoSuchKey" });
      },
    };

    await expect(new R2NewsStorage(config, client).load()).resolves.toBeNull();
  });

  it("publishes validated JSON with the required content type", async () => {
    const commands: Array<{
      input?: { Bucket?: string; Key?: string; Body?: string; ContentType?: string };
    }> = [];
    const client = {
      send: async (command: { input?: (typeof commands)[number]["input"] }) => {
        commands.push(command);
        return {};
      },
    };

    await new R2NewsStorage(config, client).save(validNewsFile);

    expect(commands[0]?.input).toMatchObject({
      Bucket: "news-bucket",
      Key: "noticias.json",
      ContentType: "application/json; charset=utf-8",
    });
    expect(commands[0]?.input?.Body).toContain('"totalNews": 0');
  });

  it("does not publish an invalid document", async () => {
    let calls = 0;
    const client = { send: async () => (calls += 1) };
    const invalid = { ...validNewsFile, totalNews: 1 };

    await expect(new R2NewsStorage(config, client).save(invalid)).rejects.toThrow(
      "No se publicará",
    );
    expect(calls).toBe(0);
  });
});
