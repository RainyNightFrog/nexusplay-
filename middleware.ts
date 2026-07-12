import { createServerClient } from "@supabase/ssr";
import { NextResponse, NextRequest } from "next/server";
import { shouldSkipAccountIntent } from "@/lib/account-intent";
import { resolveUserRole, hasCreatorDashboardAccess } from "@/lib/auth-profile";
import { resolveAdminAccess } from "@/lib/admin-auth";
import { getAccountStatusRecord, isAccountRestricted } from "@/lib/account-status";
import { ANALYTICS_SESSION_COOKIE } from "@/lib/analytics-service";
import { getSupabaseCookieOptions } from "@/lib/supabase/cookie-options";
import {
  buildSubdomainRedundantPathRedirect,
  buildSubdomainRewritePath,
  isSubdomainCanonicalPath,
  resolveSubdomainFromHost,
} from "@/lib/subdomain";
import { resolveSubdomainRoute } from "@/lib/creator-username";
import { routing } from "@/i18n/routing";
import createIntlMiddleware from "next-intl/middleware";

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

function finalizeMiddlewareResponse(
  request: NextRequest,
  response: NextResponse,
  rewriteUrl: URL | null
) {
  if (!rewriteUrl) {
    return response;
  }

  const rewriteResponse = NextResponse.rewrite(rewriteUrl, {
    request: { headers: request.headers },
  });

  response.cookies.getAll().forEach((cookie) => {
    rewriteResponse.cookies.set(cookie);
  });

  response.headers.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") return;
    rewriteResponse.headers.set(key, value);
  });

  return rewriteResponse;
}

function sanitizePathname(pathname: string) {
  if (!/[^\x00-\x7F]/.test(pathname)) {
    return pathname;
  }

  const cleaned = pathname.replace(/[^\x00-\x7F].*$/, "");
  return cleaned || "/";
}

export async function middleware(request: NextRequest) {
  if (
    request.nextUrl.pathname === "/zh-TW" ||
    request.nextUrl.pathname.startsWith("/zh-TW/")
  ) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname =
      redirectUrl.pathname.replace(/^\/zh-TW(?=\/|$)/, "") || "/";
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

  if (!isAuthLoginPage) {
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

    const role = await resolveUserRole(supabase, user);

    if (!hasCreatorDashboardAccess(user, role)) {
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
      redirectUrl.pathname = redirectTarget.startsWith("/")
        ? redirectTarget
        : "/";
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
