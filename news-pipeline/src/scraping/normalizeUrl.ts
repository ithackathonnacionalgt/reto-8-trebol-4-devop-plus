const TRACKING_PARAMETER = /^utm_/i;

export function normalizeUrl(value: string): string {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch (error) {
    throw new TypeError("La URL debe ser absoluta y válida", { cause: error });
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new TypeError("La URL debe utilizar HTTP o HTTPS");
  }

  parsed.hash = "";
  for (const parameter of [...parsed.searchParams.keys()]) {
    if (TRACKING_PARAMETER.test(parameter)) {
      parsed.searchParams.delete(parameter);
    }
  }

  if (parsed.pathname.length > 1) {
    parsed.pathname = parsed.pathname.replace(/\/+$/, "");
  }

  return parsed.toString();
}
