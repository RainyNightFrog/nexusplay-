"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { buildChooseRolePath, shouldSkipAccountIntent } from "@/lib/account-intent";
import { AUTH_REDIRECT_COOKIE } from "@/lib/auth-redirect-cookie";
import {
  beginAuthCodeExchange,
  completeAuthCodeExchange,
  failAuthCodeExchange,
} from "@/lib/auth-callback-exchange";
import { createClient } from "@/lib/supabase/client";
import {
  clearPkceVerifierBackup,
  clearStaleSupabaseSessionCookies,
  exchangePkceCodeForSession,
  resolvePkceVerifierForExchange,
} from "@/lib/supabase/pkce";

function readAuthRedirectFromDocument(): string {
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${AUTH_REDIRECT_COOKIE}=([^;]*)`)
  );
  if (!match?.[1]) return "/";

  try {
    const decoded = decodeURIComponent(match[1]);
    return decoded.startsWith("/") ? decoded : "/";
  } catch {
    return "/";
  }
}

function clearAuthRedirectCookie() {
  document.cookie = `${AUTH_REDIRECT_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}

const OAUTH_IN_FLIGHT_KEY = "oauth:in-flight";

export function AuthCallbackClient() {
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("正在完成登入…");

  useEffect(() => {
    const code = searchParams.get("code");
    const redirectTo = searchParams.get("redirect") ?? readAuthRedirectFromDocument();
    const safeRedirect = redirectTo.startsWith("/") ? redirectTo : "/";

    const redirectToAuthError = (reason?: string) => {
      const failUrl = new URL("/auth", window.location.origin);
      failUrl.searchParams.set("error", "callback");
      if (reason) {
        failUrl.searchParams.set("reason", reason.slice(0, 180));
      }
      window.sessionStorage.removeItem(OAUTH_IN_FLIGHT_KEY);
      window.location.replace(failUrl.toString());
    };

    if (!code) {
      redirectToAuthError();
      return;
    }

    if (!beginAuthCodeExchange(code)) {
      return;
    }

    void (async () => {
      try {
        setMessage("正在驗證登入…");

        const codeVerifier = resolvePkceVerifierForExchange();
        clearStaleSupabaseSessionCookies();

        if (!codeVerifier) {
          failAuthCodeExchange(code);
          redirectToAuthError(
            "PKCE code verifier not found in storage. This can happen if the auth flow was initiated in a different browser or device, or if the storage was cleared. For SSR frameworks (Next.js)"
          );
          return;
        }

        const exchangeResult = await exchangePkceCodeForSession(code, codeVerifier);
        if (exchangeResult.error) {
          failAuthCodeExchange(code);
          redirectToAuthError(exchangeResult.error.message);
          return;
        }

        const supabase = createClient();
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: exchangeResult.access_token,
          refresh_token: exchangeResult.refresh_token,
        });

        if (sessionError) {
          failAuthCodeExchange(code);
          redirectToAuthError(sessionError.message);
          return;
        }

        completeAuthCodeExchange(code);
        clearPkceVerifierBackup();
        clearAuthRedirectCookie();
        window.sessionStorage.removeItem(OAUTH_IN_FLIGHT_KEY);

        const path =
          exchangeResult.user && shouldSkipAccountIntent(exchangeResult.user)
            ? safeRedirect
            : buildChooseRolePath(safeRedirect);

        window.location.replace(path);
      } catch (error) {
        failAuthCodeExchange(code);
        const reason =
          error instanceof Error ? error.message : "OAuth callback failed";
        redirectToAuthError(reason);
      }
    })();
  }, [searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-100">
      <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-5 py-4">
        <Loader2 className="size-5 animate-spin text-cyan-400" />
        <p className="text-sm text-zinc-300">{message}</p>
      </div>
    </div>
  );
}
