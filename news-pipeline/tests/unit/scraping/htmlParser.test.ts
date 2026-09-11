import { describe, expect, it } from "vitest";

import { extractText, parseLinks } from "../../../src/scraping/htmlParser.js";

describe("htmlParser", () => {
  it("extracts text without executing markup", () => {
    expect(extractText("<strong>Alerta</strong> &amp; aviso <!-- hidden -->")).toBe(
      "Alerta & aviso",
    );
  });

  it("extracts anchor data as plain values", () => {
    expect(parseLinks('<a href="/news/1"> Primera <b>noticia</b> </a>')).toEqual([
      { href: "/news/1", text: "Primera noticia" },
    ]);
  });
});
