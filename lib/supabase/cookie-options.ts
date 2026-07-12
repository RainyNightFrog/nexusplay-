import type { CookieOptionsWithName } from "@supabase/ssr";

function isLocalHost(hostname: string) {
  const host = hostname.toLowerCase();
  return host === "localhost" || host === "127.0.0.1" || host.endsWith(".localhost");
}

function getSupabaseCookieOptionsForHost(hostname: string): CookieOptionsWithName {
  const host = hostname.toLowerCase();
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN?.trim().toLowerCase();

  if (isLocalHost(host)) {
    return { path: "/", sameSite: "lax" };
  }

  if (
    rootDomain &&
    (host === rootDomain || host === `www.${rootDomain}` || host.endsWith(`.${rootDomain}`))
  ) {
    return { path: "/", sameSite: "lax", domain: `.${rootDomain}` };
  }

  return { path: "/", sameSite: "lax" };
}

/** 讓主網域與子網域共用 Supabase PKCE / session cookies（本機不設 domain） */
export function getSupabaseCookieOptions(): CookieOptionsWithName {
  if (typeof window !== "undefined") {
    return getSupabaseCookieOptionsForHost(window.location.hostname);
  }

  if (process.env.NODE_ENV === "development") {
    return { path: "/", sameSite: "lax" };
  }

  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN?.trim().toLowerCase();
  if (!rootDomain) {
    return { path: "/", sameSite: "lax" };
  }

  return { path: "/", sameSite: "lax", domain: `.${rootDomain}` };
}
