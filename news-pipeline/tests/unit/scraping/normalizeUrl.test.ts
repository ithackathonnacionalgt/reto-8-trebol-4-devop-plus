import { describe, expect, it } from "vitest";

import { normalizeUrl } from "../../../src/scraping/normalizeUrl.js";

describe("normalizeUrl", () => {
  it("removes tracking parameters, fragments and inconsistent trailing slashes", () => {
    expect(normalizeUrl("HTTPS://Example.GT/news/article///?utm_source=feed&id=7#section")).toBe(
      "https://example.gt/news/article?id=7",
    );
  });

  it("keeps parameters that can identify a different resource", () => {
    expect(normalizeUrl("https://example.gt/download?file=one&utm_medium=email")).toBe(
      "https://example.gt/download?file=one",
    );
  });

  it("rejects relative and non-HTTP URLs", () => {
    expect(() => normalizeUrl("/relative/article")).toThrow();
    expect(() => normalizeUrl("javascript:alert(1)")).toThrow();
  });
});
