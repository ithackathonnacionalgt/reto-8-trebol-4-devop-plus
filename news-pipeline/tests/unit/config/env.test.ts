import { describe, expect, it } from "vitest";

import {
  loadEnvironmentConfig,
  requireDeepSeekConfig,
  requireR2Config,
} from "../../../src/config/env.js";
import { ConfigurationError } from "../../../src/errors/ConfigurationError.js";

describe("loadEnvironmentConfig", () => {
  it("uses safe defaults for local development", () => {
    expect(loadEnvironmentConfig({})).toMatchObject({
      nodeEnv: "development",
      logLevel: "info",
      dryRun: true,
      scraper: {
        timeoutMs: 15_000,
        delayMs: 1_000,
        maxRetries: 2,
      },
      deepSeek: {
        timeoutMs: 60_000,
        maxRetries: 2,
      },
    });
  });

  it("coerces numeric and boolean variables", () => {
    const config = loadEnvironmentConfig({
      SCRAPER_TIMEOUT_MS: "2000",
      SCRAPER_DELAY_MS: "0",
      SCRAPER_MAX_RETRIES: "3",
      AI_TIMEOUT_MS: "7000",
      AI_MAX_RETRIES: "4",
      DRY_RUN: "false",
    });

    expect(config.scraper).toMatchObject({ timeoutMs: 2000, delayMs: 0, maxRetries: 3 });
    expect(config.deepSeek).toMatchObject({ timeoutMs: 7000, maxRetries: 4 });
    expect(config.dryRun).toBe(false);
  });

  it("rejects invalid values", () => {
    expect(() => loadEnvironmentConfig({ SCRAPER_TIMEOUT_MS: "none" })).toThrow(ConfigurationError);
    expect(() => loadEnvironmentConfig({ DRY_RUN: "yes" })).toThrow(ConfigurationError);
  });

  it("requires credentials only when an external provider is selected", () => {
    const config = loadEnvironmentConfig({});

    expect(() => requireDeepSeekConfig(config)).toThrow(
      "Falta la variable de entorno DEEPSEEK_API_KEY",
    );
    expect(() => requireR2Config(config)).toThrow("Falta la variable de entorno R2_ACCOUNT_ID");
  });
});
