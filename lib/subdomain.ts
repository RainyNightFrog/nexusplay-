/** 平台根網域（不含子網域前綴） */
import { defaultLocale, locales, type AppLocale } from "@/i18n/routing";

export function getRootDomain() {
  return (
    process.env.NEXT_PUBLIC_ROOT_DOMAIN?.trim().toLowerCase() ||
    "rainynightfrog.com"
  );
}

/** 保留子網域：不可作為遊戲 / 創作者專屬網址 */
export const RESERVED_SUBDOMAINS = new Set([
  "www",
  "api",
  "admin",
  "dashboard",
  "auth",
  "app",
  "cdn",
  "static",
  "assets",
  "mail",
  "email",
  "ftp",
  "blog",
  "help",
  "support",
  "status",
  "staging",
  "dev",
  "test",
  "preview",
  "game",
  "games",
]);

export function isReservedSubdomain(subdomain: string) {
  return RESERVED_SUBDOMAINS.has(subdomain.toLowerCase());
}

/**
 * 從 Host header 解析子網域標籤。
 * 支援 production（void-gacha.rainynightfrog.com）與本機（void-gacha.localhost）。
 */
export function resolveSubdomainFromHost(host: string): string | null {
  const hostname = host.split(":")[0]?.trim().toLowerCase();
  if (!hostname) return null;

  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return null;
  }

  if (hostname.endsWith(".localhost")) {
    const label = hostname.slice(0, -".localhost".length);
    if (!label || label.includes(".") || isReservedSubdomain(label)) {
      return null;
    }
    return label;
  }

  const rootDomain = getRootDomain();

  if (hostname === rootDomain || hostname === `www.${rootDomain}`) {
    return null;
  }

  const suffix = `.${rootDomain}`;
  if (!hostname.endsWith(suffix)) {
    return null;
  }

  const label = hostname.slice(0, -suffix.length);
  if (!label || label.includes(".") || isReservedSubdomain(label)) {
    return null;
  }

  return label;
}

function splitLocaleFromPath(pathname: string) {
  const path = pathname || "/";

  for (const locale of locales) {
    if (path === `/${locale}`) {
      return { locale: locale as AppLocale, pathname: "/" };
    }
    if (path.startsWith(`/${locale}/`)) {
      return {
        locale: locale as AppLocale,
        pathname: path.slice(locale.length + 1) || "/",
      };
    }
  }

  return { locale: null as AppLocale | null, pathname: path };
}

function applyLocalePrefix(pathname: string, locale: AppLocale | null) {
  if (!locale || locale === defaultLocale) {
    return pathname;
  }

  if (pathname === "/") {
    return `/${locale}`;
  }

  return `/${locale}${pathname}`;
}

/**
 * 將子網域請求路徑改寫為內部 `/game/[slug]` 路由（網址列維持子網域）。
 */
export function buildSubdomainRewritePath(
  pathname: string,
  subdomain: string,
  kind: "game" | "creator" = "game"
) {
  const { locale, pathname: path } = splitLocaleFromPath(pathname);
  const base = kind === "creator" ? `/creator/${subdomain}` : `/game/${subdomain}`;

  let rewritten = base;

  if (path.startsWith("/game/") || path.startsWith("/creator/")) {
    const rest = path.replace(/^\/(game|creator)\/[^/]+/, "");
    rewritten = `${base}${rest || ""}`;
  } else if (path !== "/") {
    rewritten = `${base}${path}`;
  }

  return applyLocalePrefix(rewritten, locale);
}

export function buildGameSubdomainUrl(slug: string) {
  const normalized = slug.trim().toLowerCase();
  const rootDomain = getRootDomain();
  const protocol =
    process.env.NODE_ENV === "development" ? "http" : "https";

  if (process.env.NODE_ENV === "development") {
    const port = process.env.PORT?.trim() || "3000";
    return `${protocol}://${normalized}.localhost:${port}`;
  }

  return `${protocol}://${normalized}.${rootDomain}`;
}
