import { pathToFileURL } from "node:url";

import { MockAIProcessor } from "./ai/providers/mockProcessor.js";
import { requireR2Config, loadEnvironmentConfig } from "./config/env.js";
import { runPipeline, type PipelineDependencies } from "./app/runPipeline.js";
import { MockNewsSource } from "./sources/providers/mockSource.js";
import { SourceRegistry } from "./sources/sourceRegistry.js";
import { LocalNewsStorage } from "./storage/localNewsStorage.js";
import { R2NewsStorage } from "./storage/r2NewsStorage.js";
import type { NewsStorage } from "./storage/newsStorage.js";
import { createLogger } from "./utils/logger.js";

export function createDependencies(): PipelineDependencies {
  const config = loadEnvironmentConfig();
  const logger = createLogger(config.logLevel);
  const storage = createStorage(config);
  const previewStorage = new LocalNewsStorage(config.outputPreviewPath);
  const sources = new SourceRegistry([new MockNewsSource("MOCK")]);

  return {
    storage,
    previewStorage,
    sources: sources.list(),
    aiProcessor: new MockAIProcessor(),
    logger,
    scraperDelayMs: config.scraper.delayMs,
    dryRun: config.dryRun,
  };
}

export async function main(): Promise<void> {
  await runPipeline(createDependencies());
}

const isEntrypoint =
  process.argv[1] !== undefined && pathToFileURL(process.argv[1]).href === import.meta.url;

if (isEntrypoint) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Error desconocido";
    console.error(`[ERROR] El pipeline terminó con un error fatal: ${message}`);
    process.exitCode = 1;
  });
}

function createStorage(config: ReturnType<typeof loadEnvironmentConfig>): NewsStorage {
  const hasR2Configuration =
    config.r2.accountId !== undefined &&
    config.r2.accessKeyId !== undefined &&
    config.r2.secretAccessKey !== undefined &&
    config.r2.bucketName !== undefined;

  if (config.nodeEnv === "production") {
    return new R2NewsStorage(requireR2Config(config));
  }
  if (hasR2Configuration) {
    return new R2NewsStorage(requireR2Config(config));
  }

  return new LocalNewsStorage("./output/noticias.json");
}
