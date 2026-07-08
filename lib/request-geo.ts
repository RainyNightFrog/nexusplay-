const COUNTRY_HEADER_KEYS = [
  "x-vercel-ip-country",
  "cf-ipcountry",
  "x-country-code",
  "x-appengine-country",
] as const;

export function getCountryCodeFromHeaders(headers: Headers): string | null {
  for (const key of COUNTRY_HEADER_KEYS) {
    const value = headers.get(key)?.trim().toUpperCase();
    if (value && value !== "XX" && /^[A-Z]{2}$/.test(value)) {
      return value;
    }
  }
  return null;
}

export function getCountryCodeFromRequest(request: Request): string | null {
  return getCountryCodeFromHeaders(request.headers);
}

export function getVirtualPlayerCountryCode(virtualPlayerId: string): string {
  if (virtualPlayerId.startsWith("hk-")) return "HK";
  if (virtualPlayerId.startsWith("cn-")) return "CN";
  return "US";
}

export function formatCountryName(
  countryCode: string,
  locale: string
): string {
  const normalized = countryCode.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(normalized)) return countryCode;

  try {
    const displayNames = new Intl.DisplayNames([locale], { type: "region" });
    return displayNames.of(normalized) ?? normalized;
  } catch {
    return normalized;
  }
}
