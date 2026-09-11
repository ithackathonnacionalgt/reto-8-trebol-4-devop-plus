import { describe, expect, it } from "vitest";
import { parseListing } from "../../../src/sources/providers/ministries/mineducSource.js";

const markup = `<h2><a href="/noticia/">Información pública de interés ciudadano</a></h2>`;

describe("fuentes adicionales", () => {
  it("mantiene aislado el dominio y el identificador de cada fuente", () => {
    const sources = [
      ["MAGA", "https://www.maga.gob.gt/"], ["MIDES", "https://www.mides.gob.gt/"],
      ["INAB", "https://www.inab.gob.gt/"], ["CONADI", "https://www.conadi.gob.gt/"],
      ["PDH", "https://www.pdh.org.gt/"],
    ] as const;
    for (const [name, host] of sources) {
      expect(parseListing(markup, "2026-09-10T00:00:00Z", 1, name, host, `${host}noticias/`)[0]).toMatchObject({ source: name, originalUrl: `${host}noticia` });
    }
  });
});
