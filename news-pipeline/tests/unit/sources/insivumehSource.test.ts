import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { InsivumehNewsSource, parseInsivumehListing } from "../../../src/sources/providers/ministries/insivumehSource.js";

const fixture = readFileSync(new URL("../../fixtures/html/insivumeh-sample.html", import.meta.url), "utf8");

describe("INSIVUMEH source", () => {
  it("extracts official headlines and images", () => {
    expect(parseInsivumehListing(fixture, "2026-09-10T12:00:00Z")).toMatchObject([
      { source: "INSIVUMEH", originalUrl: "https://insivumeh.gob.gt/noticia-lluvias", imageUrl: "https://insivumeh.gob.gt/wp-content/uploads/2026/09/lluvia.jpg" },
      { originalUrl: "https://insivumeh.gob.gt/monitoreo-volcanico" },
    ]);
  });

  it("enriches each article using its detail page", async () => {
    const detail = "<html><head><meta property=\"og:image\" content=\"/img.jpg\"></head><body><time datetime=\"2026-09-10T08:00:00-06:00\"></time><p>Este contenido explica las condiciones meteorológicas y las recomendaciones para la población guatemalteca.</p></body></html>";
    const client = { get: vi.fn().mockResolvedValueOnce(fixture).mockResolvedValue(detail) };
    const source = new InsivumehNewsSource(client, { fetchOptions: { timeoutMs: 1000, userAgent: "test", maxRetries: 0, delayMs: 0 }, clock: () => new Date("2026-09-10T12:00:00Z") });
    const candidates = await source.fetchCandidates();
    expect(candidates[0]?.rawContent).toContain("Este contenido explica");
    expect(candidates[0]?.imageUrl).toBe("https://insivumeh.gob.gt/img.jpg");
    expect(client.get).toHaveBeenCalledTimes(3);
  });
});
