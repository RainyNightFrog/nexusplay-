export const PRODUCTION_SITE_URL = "https://nexusplay-five.vercel.app";
export const LOCAL_SITE_URL = "http://localhost:3000";

export function getAuthCallbackUrl(origin: string) {
  return `${origin.replace(/\/$/, "")}/auth/callback`;
}

export function getAuthRedirectAllowList(siteUrl = PRODUCTION_SITE_URL) {
  const productionBase = siteUrl.replace(/\/$/, "");
  const localBase = LOCAL_SITE_URL.replace(/\/$/, "");
  return [
    getAuthCallbackUrl(siteUrl),
    `${productionBase}/**`,
    getAuthCallbackUrl(LOCAL_SITE_URL),
    `${localBase}/**`,
  ];
}

/** Split glued entries like `.../callbackhttp://localhost...` into separate URLs. */
export function expandRedirectAllowListEntry(value: string): string[] {
  const trimmed = value.trim();
  if (!trimmed) return [];
  return trimmed
    .split(/(?<=\/auth\/callback)(?=https?:\/\/)/i)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function mergeAuthRedirectAllowList(
  existing: string | null | undefined,
  siteUrl = PRODUCTION_SITE_URL
) {
  const values = new Set<string>();

  for (const entry of String(existing ?? "").split(/[\n,]/)) {
    for (const url of expandRedirectAllowListEntry(entry)) {
      values.add(url);
    }
  }

  for (const url of getAuthRedirectAllowList(siteUrl)) {
    values.add(url);
  }

  return [...values].join("\n");
}
