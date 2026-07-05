import createIntlMiddleware from "next-intl/middleware";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { resolveUserRole, hasCreatorDashboardAccess } from "@/lib/auth-profile";
import { isAdminUser } from "@/lib/admin-auth";
import { ANALYTICS_SESSION_COOKIE } from "@/lib/analytics-service";
import { routing } from "@/i18n/routing";

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

export async function middleware(request: NextRequest) {
  const response = intlMiddleware(request);
  const pathnameWithoutLocale = stripLocalePrefix(request.nextUrl.pathname);

  if (!request.cookies.get(ANALYTICS_SESSION_COOKIE)?.value) {
    response.cookies.set(ANALYTICS_SESSION_COOKIE, crypto.randomUUID(), {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (pathnameWithoutLocale.startsWith("/admin")) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/auth";
    redirectUrl.searchParams.set(
      "redirect",
      pathnameWithoutLocale === "/admin"
        ? "/admin"
        : pathnameWithoutLocale
    );

    if (!user) {
      return NextResponse.redirect(redirectUrl);
    }

    if (!isAdminUser(user)) {
      redirectUrl.searchParams.set("hint", "admin");
      return NextResponse.redirect(redirectUrl);
    }
  }

  if (pathnameWithoutLocale.startsWith("/dashboard")) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/auth";
    redirectUrl.searchParams.set(
      "redirect",
      pathnameWithoutLocale === "/dashboard"
        ? "/dashboard"
        : pathnameWithoutLocale
    );

    if (!user) {
      return NextResponse.redirect(redirectUrl);
    }

    const role = await resolveUserRole(supabase, user);

    if (!hasCreatorDashboardAccess(user, role)) {
      redirectUrl.searchParams.set("hint", "creator");
      return NextResponse.redirect(redirectUrl);
    }
  }

  if (
    pathnameWithoutLocale.startsWith("/account") ||
    pathnameWithoutLocale.startsWith("/profile") ||
    pathnameWithoutLocale.startsWith("/settings")
  ) {
    if (!user) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/auth";
      redirectUrl.searchParams.set("redirect", pathnameWithoutLocale);
      return NextResponse.redirect(redirectUrl);
    }
  }

  if (pathnameWithoutLocale === "/auth/choose-role") {
    if (!user) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/auth";
      redirectUrl.searchParams.set(
        "redirect",
        request.nextUrl.searchParams.get("redirect") ?? "/"
      );
      return NextResponse.redirect(redirectUrl);
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|auth/callback|_next|_vercel|.*\\..*).*)"],
};
