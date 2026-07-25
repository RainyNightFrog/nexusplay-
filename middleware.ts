import { createServerClient } from "@supabase/ssr";
import { NextResponse, NextRequest } from "next/server";
import {
  isChooseRoleSwitchRequested,
  shouldSkipAccountIntent,
} from "@/lib/account-intent";
import { resolveUserProfile, hasCreatorDashboardAccess } from "@/lib/auth-profile";
import { resolveAdminAccess } from "@/lib/admin-auth";
import { getAccountStatusRecord, isAccountRestricted } from "@/lib/account-status";
import { ANALYTICS_SESSION_COOKIE } from "@/lib/analytics-service";
import { getSupabaseCookieOptions } from "@/lib/supabase/cookie-options";
import {
  buildSubdomainApexRedirectUrl,
  buildSubdomainRewritePath,
  isSubdomainApexPath,
  resolveSubdomainFromHost,
} from "@/lib/subdomain";
import {
  getPlayOrigin,
  isPlayEmbedHost,
  isPlayEmbedPath,
} from "@/lib/play-origin";
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
  const hostHeader = request.headers.get("host") ?? "";

  // play.*：僅允許上傳遊戲 embed 資產，其餘導回主站
  if (isPlayEmbedHost(hostHeader)) {
    const pathname = request.nextUrl.pathname;
    if (!isPlayEmbedPath(pathname)) {
      const playOrigin = getPlayOrigin();
      const siteUrl =
        process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
        buildSubdomainApexRedirectUrl(hostHeader, "/", "").replace(/\/$/, "");
      if (playOrigin && siteUrl.startsWith(playOrigin)) {
        return new NextResponse("Not Found", { status: 404 });
      }
      return NextResponse.redirect(siteUrl || "https://rainynightfrog.com", 307);
    }
    return NextResponse.next();
  }

  // matcher 含 /api/games/* 只為 play.* 閘道；主站 API 不可經 next-intl
  // 改寫成 /zh-HK/api/...，否則會 404，遊戲頁會誤顯示「找不到遊戲」
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // 舊語系別名 → 預設繁中（zh-HK，localePrefix as-needed 會去掉前綴）
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

  const subdomainLabel = resolveSubdomainFromHost(hostHeader);
  let effectiveRequest = request;
  let rewriteUrl: URL | null = null;

  // 子網域上的帳號／後台路徑 → 導回主網域
  if (subdomainLabel && isSubdomainApexPath(request.nextUrl.pathname)) {
    const apex = buildSubdomainApexRedirectUrl(
      hostHeader,
      request.nextUrl.pathname,
      request.nextUrl.search
    );
    return NextResponse.redirect(apex, 307);
  }

  // vanity 遊戲／創作者子網域 → 導回主站對應頁（host-only cookie）
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

    const apexPath = buildSubdomainRewritePath(
      request.nextUrl.pathname,
      subdomainLabel,
      routeKind
    );
    const apex = buildSubdomainApexRedirectUrl(
      hostHeader,
      apexPath,
      request.nextUrl.search
    );
    return NextResponse.redirect(apex, 307);
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
    const dashboardTarget =
      pathnameWithoutLocale === "/dashboard"
        ? "/dashboard"
        : pathnameWithoutLocale;

    if (!user) {
      const redirectUrl = effectiveRequest.nextUrl.clone();
      redirectUrl.pathname = "/auth";
      redirectUrl.searchParams.set("redirect", dashboardTarget);
      redirectUrl.searchParams.set("hint", "creator");
      return finalizeMiddlewareResponse(
        request,
        NextResponse.redirect(redirectUrl),
        rewriteUrl
      );
    }

    const profile = await resolveUserProfile(supabase, user);

    if (!hasCreatorDashboardAccess(user, profile.role, profile.is_admin)) {
      // 已登入玩家改走身分選擇（switch=1），避免 auth↔dashboard 迴圈
      const chooseRoleUrl = effectiveRequest.nextUrl.clone();
      chooseRoleUrl.pathname = "/auth/choose-role";
      chooseRoleUrl.search = "";
      chooseRoleUrl.searchParams.set("redirect", dashboardTarget);
      chooseRoleUrl.searchParams.set("switch", "1");
      return finalizeMiddlewareResponse(
        request,
        NextResponse.redirect(chooseRoleUrl),
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
      const allowSwitch = isChooseRoleSwitchRequested(
        effectiveRequest.nextUrl.searchParams
      );

      if (allowSwitch) {
        const profile = await resolveUserProfile(supabase, user);
        // 已是創作者才略過；玩家可重選身分升級為創作者
        if (!hasCreatorDashboardAccess(user, profile.role, profile.is_admin)) {
          return finalizeMiddlewareResponse(request, response, rewriteUrl);
        }
      }

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
  matcher: ["/((?!api|auth/callback|_next|_vercel|feed/|.*\\..*).*)", "/api/games/:path*"],
};
