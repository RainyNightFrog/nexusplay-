import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";

type PendingCookie = {
  name: string;
  value: string;
  options: CookieOptions;
};

export function resolveAuthRedirectBase(request: NextRequest, origin: string) {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const isLocalEnv = process.env.NODE_ENV === "development";

  if (isLocalEnv) {
    return origin.replace(/\/$/, "");
  }

  if (forwardedHost) {
    return `https://${forwardedHost}`;
  }

  return origin.replace(/\/$/, "");
}

export function createAuthCallbackClient(request: NextRequest) {
  const cookieJar = new Map<string, PendingCookie>();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const cookie of cookiesToSet) {
            cookieJar.set(cookie.name, cookie);
          }
        },
      },
    }
  );

  return {
    supabase,
    applyCookies(response: NextResponse) {
      cookieJar.forEach(({ name, value, options }) => {
        response.cookies.set(name, value, options);
      });
    },
  };
}
