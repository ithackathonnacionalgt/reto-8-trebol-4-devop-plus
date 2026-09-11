import { describe, expect, it } from "vitest";

import { createLogger } from "../../../src/utils/logger.js";

describe("createLogger", () => {
  it("writes Spanish messages and redacts secrets", () => {
    const lines: string[] = [];
    const logger = createLogger("debug", { write: (line) => lines.push(line) });

    logger.info("Pipeline iniciado", {
      apiKey: "private-api-key",
      nested: { R2_SECRET_ACCESS_KEY: "private-r2-secret" },
      error: new Error("Fallo temporal"),
    });

    expect(lines).toEqual([
      '[INFO] Pipeline iniciado {"apiKey":"[REDACTED]","nested":{"R2_SECRET_ACCESS_KEY":"[REDACTED]"},"error":{"name":"Error","message":"Fallo temporal"}}',
    ]);
    expect(lines.join(" ")).not.toContain("private-api-key");
    expect(lines.join(" ")).not.toContain("private-r2-secret");
  });

  it("omits messages below the configured level", () => {
    const lines: string[] = [];
    const logger = createLogger("warn", { write: (line) => lines.push(line) });

    logger.info("Este mensaje no se debe registrar");
    logger.warn("Se continuará con las demás fuentes");

    expect(lines).toEqual(["[WARN] Se continuará con las demás fuentes"]);
  });
});
