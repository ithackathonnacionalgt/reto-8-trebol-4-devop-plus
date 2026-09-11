export interface FetchPageOptions {
  timeoutMs: number;
  userAgent: string;
  maxRetries: number;
  delayMs: number;
  headers?: Record<string, string>;
}

export interface ParsedLink {
  href: string;
  text: string;
}

export type FetchImplementation = (input: string, init?: RequestInit) => Promise<Response>;
