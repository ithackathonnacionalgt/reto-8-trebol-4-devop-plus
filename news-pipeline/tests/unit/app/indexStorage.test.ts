import { describe, expect, it } from "vitest";

import { loadEnvironmentConfig } from "../../../src/config/env.js";
import { createStorage } from "../../../src/index.js";
import { LocalNewsStorage } from "../../../src/storage/localNewsStorage.js";

describe("production dry run configuration", () => {
  it("allows local history when R2 is incomplete during dry run", () => {
    const config = loadEnvironmentConfig({ NODE_ENV: "production", DRY_RUN: "true" });

    expect(config.dryRun).toBe(true);
    expect(config.r2.bucketName).toBeUndefined();
    expect(createStorage(config)).toBeInstanceOf(LocalNewsStorage);
  });
});
