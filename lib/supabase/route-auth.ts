import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { NextRequest } from "next/server";

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
  let pendingCookies: PendingCookie[] = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          pendingCookies = cookiesToSet;
        },
      },
    }
  );

  return {
    supabase,
    applyCookies(response: Response) {
      if (!("cookies" in response)) return;

      const nextResponse = response as Response & {
        cookies: {
          set: (name: string, value: string, options?: CookieOptions) => void;
        };
      };

      pendingCookies.forEach(({ name, value, options }) => {
        nextResponse.cookies.set(name, value, options);
      });
    },
  };
}
