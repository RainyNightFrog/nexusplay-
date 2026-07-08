export const PRODUCTION_SITE_URL = "https://rainynightfrog.com";
export const LEGACY_PRODUCTION_SITE_URL = "https://nexusplay-five.vercel.app";
export const LOCAL_SITE_URL = "http://localhost:3000";

export function getAuthCallbackUrl(origin) {
  return `${origin.replace(/\/$/, "")}/auth/callback`;
}

export function getProductionSiteOrigins() {
  return [
    PRODUCTION_SITE_URL,
    "https://www.rainynightfrog.com",
    LEGACY_PRODUCTION_SITE_URL,
  ];
}

export function getAuthRedirectAllowList(siteUrl = PRODUCTION_SITE_URL) {
  const origins = new Set([
    siteUrl.replace(/\/$/, ""),
    ...getProductionSiteOrigins().map((origin) => origin.replace(/\/$/, "")),
    LOCAL_SITE_URL.replace(/\/$/, ""),
  ]);

  const urls = new Set();
  for (const origin of origins) {
    urls.add(getAuthCallbackUrl(origin));
    urls.add(`${origin}/**`);
  }

  return [...urls];
}

export function expandRedirectAllowListEntry(value) {
  const trimmed = value.trim();
  if (!trimmed) return [];
  return trimmed
    .split(/(?<=\/auth\/callback)(?=https?:\/\/)/i)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function mergeAuthRedirectAllowList(existing, siteUrl = PRODUCTION_SITE_URL) {
  const values = new Set();

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

export const GOOGLE_AUTHORIZED_JAVASCRIPT_ORIGINS = [
  PRODUCTION_SITE_URL,
  "https://www.rainynightfrog.com",
  LEGACY_PRODUCTION_SITE_URL,
  LOCAL_SITE_URL,
];
