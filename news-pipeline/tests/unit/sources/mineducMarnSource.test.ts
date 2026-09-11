import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseMineducListing } from "../../../src/sources/providers/ministries/mineducSource.js";
import { parseMarnListing } from "../../../src/sources/providers/ministries/marnSource.js";

describe("MINEDUC y MARN", () => {
  it("parsea noticias de MINEDUC", () => {
    const html = readFileSync(new URL("../../fixtures/html/mineduc-sample.html", import.meta.url), "utf8");
    expect(parseMineducListing(html, "2026-09-10T00:00:00Z")).toHaveLength(2);
  });
  it("parsea noticias de MARN e imagen", () => {
    const html = readFileSync(new URL("../../fixtures/html/marn-sample.html", import.meta.url), "utf8");
    expect(parseMarnListing(html, "2026-09-10T00:00:00Z")[0]).toMatchObject({ source: "MARN", imageUrl: "https://marn.gob.gt/wp-content/uploads/2026/09/ambiente.jpg" });
  });
});
