export const PRODUCTION_SITE_URL = "https://rainynightfrog.com";
export const LEGACY_PRODUCTION_SITE_URL = "https://nexusplay-five.vercel.app";
export const LOCAL_SITE_URL = "http://localhost:3000";

export function getAuthCallbackUrl(origin: string) {
  return `${origin.replace(/\/$/, "")}/auth/callback`;
}

/** OAuth 回呼一律用主網域，避免在 void-gacha 等子網域登入時 callback 不在白名單內 */
export function resolveAuthCallbackOrigin(windowOrigin: string) {
  const origin = windowOrigin.replace(/\/$/, "");
  const rootDomain = (
    process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "rainynightfrog.com"
  )
    .trim()
    .toLowerCase();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");

  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) {
    return origin;
  }

  try {
    const hostname = new URL(origin).hostname.toLowerCase();
    const isSubdomain =
      hostname.endsWith(`.${rootDomain}`) &&
      hostname !== rootDomain &&
      hostname !== `www.${rootDomain}`;

    if (isSubdomain) {
      return siteUrl ?? `https://${rootDomain}`;
    }
  } catch {
    // fall through
  }

  return origin;
}

export function getStableAuthCallbackUrl(windowOrigin: string) {
  return getAuthCallbackUrl(resolveAuthCallbackOrigin(windowOrigin));
}

export function buildPasswordResetCallbackUrl(windowOrigin: string) {
  const resetRedirect = encodeURIComponent("/auth?mode=reset");
  return `${getStableAuthCallbackUrl(windowOrigin)}?redirect=${resetRedirect}`;
}

export function getProductionSiteOrigins() {
  return [PRODUCTION_SITE_URL, `https://www.rainynightfrog.com`, LEGACY_PRODUCTION_SITE_URL];
}

export function getAuthRedirectAllowList(siteUrl = PRODUCTION_SITE_URL) {
  const origins = new Set([
    siteUrl.replace(/\/$/, ""),
    ...getProductionSiteOrigins().map((origin) => origin.replace(/\/$/, "")),
    LOCAL_SITE_URL.replace(/\/$/, ""),
  ]);

  const urls = new Set<string>();
  for (const origin of origins) {
    urls.add(getAuthCallbackUrl(origin));
    urls.add(`${origin}/**`);
  }

  return [...urls];
}

/** Split glued entries like `.../callbackhttps://localhost...` into separate URLs. */
export function expandRedirectAllowListEntry(value: string): string[] {
  const trimmed = value.trim();
  if (!trimmed) return [];

  const parts = trimmed.split(/[\n,]|(?=https?:\/\/)/i);
  return parts.map((part) => part.trim()).filter(Boolean);
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

  return [...values].join(",");
}

export const GOOGLE_AUTHORIZED_JAVASCRIPT_ORIGINS = [
  PRODUCTION_SITE_URL,
  "https://www.rainynightfrog.com",
  LEGACY_PRODUCTION_SITE_URL,
  LOCAL_SITE_URL,
];
