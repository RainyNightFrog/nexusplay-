import type { NextRequest, NextResponse } from "next/server";

export const AUTH_REDIRECT_COOKIE = "auth_redirect";
const AUTH_REDIRECT_MAX_AGE = 600;

export function setAuthRedirectCookie(redirectTo: string) {
  if (typeof document === "undefined") return;
  const safe = redirectTo.startsWith("/") ? redirectTo : "/";
  document.cookie = `${AUTH_REDIRECT_COOKIE}=${encodeURIComponent(safe)}; path=/; max-age=${AUTH_REDIRECT_MAX_AGE}; SameSite=Lax`;
}

export function readAuthRedirectFromRequest(request: NextRequest): string {
  const raw = request.cookies.get(AUTH_REDIRECT_COOKIE)?.value;
  if (!raw) return "/";
  try {
    const decoded = decodeURIComponent(raw);
    return decoded.startsWith("/") ? decoded : "/";
  } catch {
    return "/";
  }
}

export function clearAuthRedirectCookie(response: NextResponse) {
  response.cookies.set(AUTH_REDIRECT_COOKIE, "", { path: "/", maxAge: 0 });
}
