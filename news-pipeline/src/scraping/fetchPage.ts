import type { HttpClient } from "./httpClient.js";
import type { FetchPageOptions } from "./types.js";

export async function fetchPage(
  client: HttpClient,
  url: string,
  options: FetchPageOptions,
): Promise<string> {
  return client.get(url, options);
}
