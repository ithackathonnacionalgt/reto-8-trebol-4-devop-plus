import type { ParsedLink } from "./types.js";

const anchorPattern = /<a\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a\s*>/gi;
const tagPattern = /<[^>]*>/g;
const commentPattern = /<!--[\s\S]*?-->/g;

const decodeEntities = (text: string): string =>
  text
    .replaceAll(/&amp;/gi, "&")
    .replaceAll(/&quot;/gi, '"')
    .replaceAll(/&#39;|&apos;/gi, "'")
    .replaceAll(/&lt;/gi, "<")
    .replaceAll(/&gt;/gi, ">");

export function extractText(html: string): string {
  return decodeEntities(html.replace(commentPattern, "").replace(tagPattern, " "))
    .replaceAll(/\s+/g, " ")
    .trim();
}

export function parseLinks(html: string): ParsedLink[] {
  const links: ParsedLink[] = [];
  for (const match of html.matchAll(anchorPattern)) {
    const href = match[1];
    const rawText = match[2];
    if (href === undefined || rawText === undefined) {
      continue;
    }
    links.push({ href, text: extractText(rawText) });
  }
  return links;
}
