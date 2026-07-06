export const PRODUCTION_SITE_URL = "https://nexusplay-five.vercel.app";
export const LOCAL_SITE_URL = "http://localhost:3000";

export function getAuthCallbackUrl(origin: string) {
  return `${origin.replace(/\/$/, "")}/auth/callback`;
}

export function getAuthRedirectAllowList(siteUrl = PRODUCTION_SITE_URL) {
  const productionCallback = getAuthCallbackUrl(siteUrl);
  const localCallback = getAuthCallbackUrl(LOCAL_SITE_URL);
  return [productionCallback, localCallback];
}

export function mergeAuthRedirectAllowList(
  existing: string | null | undefined,
  siteUrl = PRODUCTION_SITE_URL
) {
  const values = new Set(getAuthRedirectAllowList(siteUrl));
  for (const value of String(existing ?? "").split(/[\n,]/)) {
    const trimmed = value.trim();
    if (trimmed) values.add(trimmed);
  }
  return [...values].join("\n");
}
