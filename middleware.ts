import { createServerClient } from "@supabase/ssr";
import { NextResponse, NextRequest } from "next/server";
import { shouldSkipAccountIntent } from "@/lib/account-intent";
import { resolveUserProfile, hasCreatorDashboardAccess } from "@/lib/auth-profile";
import { resolveAdminAccess } from "@/lib/admin-auth";
import { getAccountStatusRecord, isAccountRestricted } from "@/lib/account-status";
import { ANALYTICS_SESSION_COOKIE } from "@/lib/analytics-service";
import { getSupabaseCookieOptions } from "@/lib/supabase/cookie-options";
import {
  buildSubdomainApexRedirectUrl,
  buildSubdomainRedundantPathRedirect,
  buildSubdomainRewritePath,
  isSubdomainApexPath,
  isSubdomainCanonicalPath,
  resolveSubdomainFromHost,
} from "@/lib/subdomain";
import { resolveSubdomainRoute } from "@/lib/creator-username";
import { routing } from "@/i18n/routing";
import createIntlMiddleware from "next-intl/middleware";
import { sanitizeInternalRedirect } from "@/lib/safe-redirect";

const intlMiddleware = createIntlMiddleware(routing);

function stripLocalePrefix(pathname: string): string {
  for (const locale of routing.locales) {
    if (pathname === `/${locale}`) {
      return "/";
    }
    if (pathname.startsWith(`/${locale}/`)) {
      return pathname.slice(locale.length + 1);
    }
  }
  return pathname;
}

/** 僅在需要驗證身分或檢查帳號限制的路由才呼叫 Supabase getUser */
function pathnameNeedsServerAuth(pathname: string) {
  if (pathname === "/auth/choose-role") return true;

  const authPrefixes = [
    "/admin",
    "/dashboard",
    "/account",
    "/profile",
    "/settings",
    "/community",
    "/notifications",
    "/supporter",
  ];

  if (authPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    return true;
  }

  return pathname.includes("/forum");
}

function applySubdomainRewrite(request: NextRequest) {
  const subdomain = resolveSubdomainFromHost(request.headers.get("host") ?? "");
  if (!subdomain) {
    return { request, rewriteUrl: null as URL | null };
  }

  const rewriteUrl = request.nextUrl.clone();
  rewriteUrl.pathname = buildSubdomainRewritePath(
    request.nextUrl.pathname,
    subdomain,
    "game"
  );

  const rewrittenRequest = new NextRequest(rewriteUrl, {
    headers: request.headers,
    method: request.method,
  });

  return { request: rewrittenRequest, rewriteUrl };
}

async function resolveSubdomainRewrite(
  request: NextRequest,
  supabase: ReturnType<typeof createServerClient>
) {
  const subdomain = resolveSubdomainFromHost(request.headers.get("host") ?? "");
  if (!subdomain) {
    return { request, rewriteUrl: null as URL | null };
  }

  let routeKind: "game" | "creator" = "game";
  try {
    const resolved = await resolveSubdomainRoute(supabase, subdomain);
    if (resolved) routeKind = resolved;
  } catch {
    routeKind = "game";
  }

  if (isSubdomainCanonicalPath(request.nextUrl.pathname, subdomain, routeKind)) {
    return { request, rewriteUrl: null as URL | null };
  }

  const rewriteUrl = request.nextUrl.clone();
  rewriteUrl.pathname = buildSubdomainRewritePath(
    request.nextUrl.pathname,
    subdomain,
    routeKind
  );

  const rewrittenRequest = new NextRequest(rewriteUrl, {
    headers: request.headers,
    method: request.method,
  });

  return { request: rewrittenRequest, rewriteUrl };
}

/**
 * next-intl 會把路徑改寫成 /[locale]/...；子網域若覆蓋成無 locale 的
 * /game/{slug}，App Router 會把 `[locale]` 誤判成 `game` 而回全域 404。
 * 非預設語系（Accept-Language: en / zh-CN）時尤其明顯。
 */
function ensureLocalePrefixedPath(pathname: string, locale: string) {
  for (const item of routing.locales) {
    if (pathname === `/${item}` || pathname.startsWith(`/${item}/`)) {
      return pathname;
    }
  }

  if (pathname === "/") {
    return `/${locale}`;
  }

  return `/${locale}${pathname}`;
}

function resolveSubdomainRewriteDestination(
  request: NextRequest,
  response: NextResponse,
  rewriteUrl: URL
) {
  const middlewareRewrite = response.headers.get("x-middleware-rewrite");
  if (middlewareRewrite) {
    try {
      return new URL(middlewareRewrite, request.url);
    } catch {
      // fall through
    }
  }

  // next-intl 對非預設語系常回 redirect（Location: /en/...）；
  // 子網域改為內部 rewrite，網址列維持乾淨根路徑。
  const location = response.headers.get("location");
  if (location && response.status >= 300 && response.status < 400) {
    try {
      const redirected = new URL(location, request.url);
      if (redirected.origin === rewriteUrl.origin) {
        return redirected;
      }
    } catch {
      // fall through
    }
  }

  const cookieLocale = request.cookies.get("NEXT_LOCALE")?.value;
  const locale =
    cookieLocale &&
    routing.locales.includes(cookieLocale as (typeof routing.locales)[number])
      ? cookieLocale
      : routing.defaultLocale;

  const destination = new URL(rewriteUrl.href);
  destination.pathname = ensureLocalePrefixedPath(
    rewriteUrl.pathname,
    locale
  );
  return destination;
}

function finalizeMiddlewareResponse(
  request: NextRequest,
  response: NextResponse,
  rewriteUrl: URL | null
) {
  if (!rewriteUrl) {
    return response;
  }

  const destination = resolveSubdomainRewriteDestination(
    request,
    response,
    rewriteUrl
  );

  const rewriteResponse = NextResponse.rewrite(destination, {
    request: { headers: request.headers },
  });

  response.cookies.getAll().forEach((cookie) => {
    rewriteResponse.cookies.set(cookie);
  });

  response.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    // 勿把 redirect Location 抄上 rewrite，否則瀏覽器會離開子網域根路徑
    if (lower === "set-cookie" || lower === "location") return;
    rewriteResponse.headers.set(key, value);
  });

  return rewriteResponse;
}

/** 香港／台灣瀏覽器常送 zh-TW；對齊預設繁中，避免落到 en 後子網域 404 */
function withNormalizedAcceptLanguage(request: NextRequest) {
  const accept = request.headers.get("accept-language");
  if (!accept || !/\bzh-(?:TW|Hant)\b/i.test(accept)) {
    return request;
  }

  const normalized = accept
    .replace(/\bzh-TW\b/gi, "zh-HK")
    .replace(/\bzh-Hant\b/gi, "zh-HK");
  if (normalized === accept) {
    return request;
  }

  const headers = new Headers(request.headers);
  headers.set("accept-language", normalized);
  return new NextRequest(request.url, {
    headers,
    method: request.method,
  });
}

function sanitizePathname(pathname: string) {
  if (!/[^\x00-\x7F]/.test(pathname)) {
    return pathname;
  }

  const cleaned = pathname.replace(/[^\x00-\x7F].*$/, "");
  return cleaned || "/";
}

export async function middleware(request: NextRequest) {
  // 舊語系別名 → 預設繁中（zh-HK，localePrefix as-needed 故去掉前綴）
  if (
    request.nextUrl.pathname === "/zh-TW" ||
    request.nextUrl.pathname.startsWith("/zh-TW/") ||
    request.nextUrl.pathname === "/zh-Hant" ||
    request.nextUrl.pathname.startsWith("/zh-Hant/")
  ) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname =
      redirectUrl.pathname.replace(/^\/(zh-TW|zh-Hant)(?=\/|$)/, "") || "/";
    return NextResponse.redirect(redirectUrl);
  }

  const sanitizedPathname = sanitizePathname(request.nextUrl.pathname);
  if (sanitizedPathname !== request.nextUrl.pathname) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = sanitizedPathname;
    return NextResponse.redirect(redirectUrl);
  }

  const subdomainLabel = resolveSubdomainFromHost(request.headers.get("host") ?? "");
  let effectiveRequest = request;
  let rewriteUrl: URL | null = null;

  // 子網域上的創作者後台／帳號路徑 → 導回主網域（避免 rewrite 成 /game/.../dashboard 而 404）
  if (subdomainLabel && isSubdomainApexPath(request.nextUrl.pathname)) {
    const apex = buildSubdomainApexRedirectUrl(
      request.headers.get("host") ?? "",
      request.nextUrl.pathname,
      request.nextUrl.search
    );
    return NextResponse.redirect(apex, 307);
  }

  if (subdomainLabel) {
    const lookupClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookieOptions: getSupabaseCookieOptions(),
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll() {},
        },
      }
    );

    let routeKind: "game" | "creator" = "game";
    try {
      const resolved = await resolveSubdomainRoute(lookupClient, subdomainLabel);
      if (resolved) routeKind = resolved;
    } catch {
      routeKind = "game";
    }

    const redundantRedirect = buildSubdomainRedundantPathRedirect(
      request.nextUrl.pathname,
      subdomainLabel,
      routeKind
    );
    if (
      redundantRedirect &&
      redundantRedirect !== request.nextUrl.pathname
    ) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = redundantRedirect;
      return NextResponse.redirect(redirectUrl);
    }

    try {
      const resolved = await resolveSubdomainRewrite(request, lookupClient);
      effectiveRequest = resolved.request;
      rewriteUrl = resolved.rewriteUrl;
    } catch {
      const fallback = applySubdomainRewrite(request);
      effectiveRequest = fallback.request;
      rewriteUrl = fallback.rewriteUrl;
    }
  }

  const oauthCode = effectiveRequest.nextUrl.searchParams.get("code");
  const pathnameWithoutLocale = stripLocalePrefix(
    effectiveRequest.nextUrl.pathname
  );

  if (
    oauthCode &&
    pathnameWithoutLocale !== "/auth/callback" &&
    !pathnameWithoutLocale.startsWith("/api/")
  ) {
    const callbackUrl = effectiveRequest.nextUrl.clone();
    callbackUrl.pathname = "/auth/callback";
    return NextResponse.redirect(callbackUrl);
  }

  effectiveRequest = withNormalizedAcceptLanguage(effectiveRequest);
  const response = intlMiddleware(effectiveRequest);

  if (!effectiveRequest.cookies.get(ANALYTICS_SESSION_COOKIE)?.value) {
    response.cookies.set(ANALYTICS_SESSION_COOKIE, crypto.randomUUID(), {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });
  }

  const isAuthLoginPage =
    pathnameWithoutLocale === "/auth" &&
    effectiveRequest.nextUrl.searchParams.get("mode") !== "reset";

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: getSupabaseCookieOptions(),
      cookies: {
        getAll() {
          return effectiveRequest.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            effectiveRequest.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // 登入頁不跑 getUser，避免伺服器端 session 清理誤刪 PKCE verifier cookie
  let user: Awaited<
    ReturnType<ReturnType<typeof createServerClient>["auth"]["getUser"]>
  >["data"]["user"] = null;

  if (!isAuthLoginPage && pathnameNeedsServerAuth(pathnameWithoutLocale)) {
    ({
      data: { user },
    } = await supabase.auth.getUser());
  }

  if (pathnameWithoutLocale.startsWith("/admin")) {
    const redirectUrl = effectiveRequest.nextUrl.clone();
    redirectUrl.pathname = "/auth";
    redirectUrl.searchParams.set(
      "redirect",
      pathnameWithoutLocale === "/admin"
        ? "/admin"
        : pathnameWithoutLocale
    );

    if (!user) {
      return finalizeMiddlewareResponse(
        request,
        NextResponse.redirect(redirectUrl),
        rewriteUrl
      );
    }

    const isAdmin = await resolveAdminAccess(user, supabase);
    if (!isAdmin) {
      redirectUrl.searchParams.set("hint", "admin");
      return finalizeMiddlewareResponse(
        request,
        NextResponse.redirect(redirectUrl),
        rewriteUrl
      );
    }
  }

  if (
    user &&
    !pathnameWithoutLocale.startsWith("/auth") &&
    !pathnameWithoutLocale.startsWith("/api/")
  ) {
    const accountStatus = await getAccountStatusRecord(user.id);
    if (accountStatus && isAccountRestricted(accountStatus)) {
      const restrictedPaths = [
        "/dashboard",
        "/settings",
        "/community",
        "/notifications",
        "/profile",
        "/supporter",
      ];
      const isRestricted =
        restrictedPaths.some((prefix) =>
          pathnameWithoutLocale.startsWith(prefix)
        ) || pathnameWithoutLocale.includes("/forum");

      if (isRestricted) {
        const redirectUrl = effectiveRequest.nextUrl.clone();
        redirectUrl.pathname = "/auth";
        redirectUrl.searchParams.set("hint", "suspended");
        if (accountStatus.ban_reason) {
          redirectUrl.searchParams.set("reason", accountStatus.ban_reason);
        }
        return finalizeMiddlewareResponse(
          request,
          NextResponse.redirect(redirectUrl),
          rewriteUrl
        );
      }
    }
  }

  if (pathnameWithoutLocale.startsWith("/dashboard")) {
    const redirectUrl = effectiveRequest.nextUrl.clone();
    redirectUrl.pathname = "/auth";
    redirectUrl.searchParams.set(
      "redirect",
      pathnameWithoutLocale === "/dashboard"
        ? "/dashboard"
        : pathnameWithoutLocale
    );

    if (!user) {
      return finalizeMiddlewareResponse(
        request,
        NextResponse.redirect(redirectUrl),
        rewriteUrl
      );
    }

    const profile = await resolveUserProfile(supabase, user);

    if (!hasCreatorDashboardAccess(user, profile.role, profile.is_admin)) {
      redirectUrl.searchParams.set("hint", "creator");
      return finalizeMiddlewareResponse(
        request,
        NextResponse.redirect(redirectUrl),
        rewriteUrl
      );
    }
  }

  if (
    pathnameWithoutLocale.startsWith("/account") ||
    pathnameWithoutLocale.startsWith("/profile") ||
    pathnameWithoutLocale.startsWith("/settings")
  ) {
    if (!user) {
      const redirectUrl = effectiveRequest.nextUrl.clone();
      redirectUrl.pathname = "/auth";
      redirectUrl.searchParams.set("redirect", pathnameWithoutLocale);
      return finalizeMiddlewareResponse(
        request,
        NextResponse.redirect(redirectUrl),
        rewriteUrl
      );
    }
  }

  if (pathnameWithoutLocale === "/auth/choose-role") {
    const redirectTarget =
      effectiveRequest.nextUrl.searchParams.get("redirect") ?? "/";

    if (!user) {
      const redirectUrl = effectiveRequest.nextUrl.clone();
      redirectUrl.pathname = "/auth";
      redirectUrl.searchParams.set("redirect", redirectTarget);
      return finalizeMiddlewareResponse(
        request,
        NextResponse.redirect(redirectUrl),
        rewriteUrl
      );
    }

    if (shouldSkipAccountIntent(user)) {
      const redirectUrl = effectiveRequest.nextUrl.clone();
      redirectUrl.pathname = sanitizeInternalRedirect(redirectTarget);
      redirectUrl.search = "";
      return finalizeMiddlewareResponse(
        request,
        NextResponse.redirect(redirectUrl),
        rewriteUrl
      );
    }
  }

  return finalizeMiddlewareResponse(request, response, rewriteUrl);
}

export const config = {
  matcher: ["/((?!api|auth/callback|_next|_vercel|feed/|.*\\..*).*)"],
};
