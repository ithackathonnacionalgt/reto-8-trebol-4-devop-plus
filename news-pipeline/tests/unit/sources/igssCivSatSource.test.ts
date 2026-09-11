import { describe, expect, it } from "vitest";
import { parseListing } from "../../../src/sources/providers/ministries/mineducSource.js";

const html = `<article><h2><a href="/noticia/">Actualización de servicios para la ciudadanía</a></h2><img src="/img/noticia.jpg"></article>`;

describe("IGSS, CIV y SAT", () => {
  it("reconoce enlaces y conserva la fuente y la imagen", () => {
    expect(parseListing(html, "2026-09-10T00:00:00Z", 30, "IGSS", "https://www.igssgt.org/", "https://www.igssgt.org/noticias/")[0]).toMatchObject({ source: "IGSS", imageUrl: "https://www.igssgt.org/img/noticia.jpg" });
    expect(parseListing(html, "2026-09-10T00:00:00Z", 30, "CIV", "https://www.civ.gob.gt/", "https://www.civ.gob.gt/web/guest/inicio")[0]?.source).toBe("CIV");
    expect(parseListing(html, "2026-09-10T00:00:00Z", 30, "SAT", "https://portal.sat.gob.gt/", "https://portal.sat.gob.gt/portal/categoria/noticias/")[0]?.source).toBe("SAT");
  });
});
