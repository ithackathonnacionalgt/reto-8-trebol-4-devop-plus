import { describe, expect, it } from "vitest";

import { SourceError } from "../../../src/errors/SourceError.js";
import { MockNewsSource } from "../../../src/sources/providers/mockSource.js";
import { SourceRegistry } from "../../../src/sources/sourceRegistry.js";

describe("SourceRegistry", () => {
  it("keeps registered sources in deterministic order", () => {
    const agn = new MockNewsSource("AGN");
    const segeplan = new MockNewsSource("SEGEPLAN");
    const registry = new SourceRegistry([agn, segeplan]);

    expect(registry.list()).toEqual([agn, segeplan]);
  });

  it("rejects empty and duplicate names", () => {
    expect(() => new SourceRegistry([new MockNewsSource(" ")])).toThrow(SourceError);

    const registry = new SourceRegistry([new MockNewsSource("AGN")]);
    expect(() => registry.register(new MockNewsSource("AGN"))).toThrow(SourceError);
  });
});
