"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { buildChooseRolePath, shouldSkipAccountIntent } from "@/lib/account-intent";
import { AUTH_REDIRECT_COOKIE } from "@/lib/auth-redirect-cookie";
import {
  beginAuthCodeExchange,
  completeAuthCodeExchange,
  failAuthCodeExchange,
} from "@/lib/auth-callback-exchange";
import { sanitizeInternalRedirect } from "@/lib/safe-redirect";
import { createClient } from "@/lib/supabase/client";
import {
  clearPkceVerifierBackup,
  clearStaleSupabaseSessionCookies,
  exchangePkceCodeForSession,
  resolvePkceVerifierForExchange,
} from "@/lib/supabase/pkce";
import {
  AuthCallbackScreen,
  type AuthCallbackMessageKey,
} from "@/components/auth/auth-callback-screen";

function readAuthRedirectFromDocument(): string {
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${AUTH_REDIRECT_COOKIE}=([^;]*)`)
  );
  if (!match?.[1]) return "/";

  try {
    const decoded = decodeURIComponent(match[1]);
    return sanitizeInternalRedirect(decoded);
  } catch {
    return "/";
  }
}

function clearAuthRedirectCookie() {
  document.cookie = `${AUTH_REDIRECT_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}

function readHashParams(): URLSearchParams {
  if (typeof window === "undefined" || !window.location.hash) {
    return new URLSearchParams();
  }

  return new URLSearchParams(window.location.hash.replace(/^#/, ""));
}

function buildPostAuthPath(
  user: { user_metadata?: Record<string, unknown> } | null | undefined,
  safeRedirect: string
) {
  return user && shouldSkipAccountIntent(user)
    ? safeRedirect
    : buildChooseRolePath(safeRedirect);
}

const OAUTH_IN_FLIGHT_KEY = "oauth:in-flight";

export function AuthCallbackClient() {
  const searchParams = useSearchParams();
  const [messageKey, setMessageKey] =
    useState<AuthCallbackMessageKey>("callbackCompleting");

  useEffect(() => {
    const redirectTo =
      searchParams.get("redirect") ?? readAuthRedirectFromDocument();
    const safeRedirect = sanitizeInternalRedirect(redirectTo);

    const redirectToAuthError = (reason?: string) => {
      const failUrl = new URL("/auth", window.location.origin);
      failUrl.searchParams.set("error", "callback");
      if (reason) {
        failUrl.searchParams.set("reason", reason.slice(0, 180));
      }
      window.sessionStorage.removeItem(OAUTH_IN_FLIGHT_KEY);
      window.location.replace(failUrl.toString());
    };

    const redirectAfterSession = (
      user: { user_metadata?: Record<string, unknown> } | null | undefined
    ) => {
      clearAuthRedirectCookie();
      window.sessionStorage.removeItem(OAUTH_IN_FLIGHT_KEY);
      window.location.replace(buildPostAuthPath(user, safeRedirect));
    };

    const handleDuplicateExchange = () => {
      void (async () => {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          redirectAfterSession(session.user);
          return;
        }

        redirectToAuthError("already_processed");
      })();
    };

    const code = searchParams.get("code");
    const tokenHash = searchParams.get("token_hash");
    const otpType = searchParams.get("type");
    const hashParams = readHashParams();
    const hashAccessToken = hashParams.get("access_token");
    const hashRefreshToken = hashParams.get("refresh_token");
    const hashType = hashParams.get("type");

    void (async () => {
      const supabase = createClient();

      if (tokenHash && otpType === "recovery") {
        try {
          setMessageKey("callbackVerifyingRecovery");
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: "recovery",
          });

          if (error) {
            redirectToAuthError(error.message);
            return;
          }

          clearAuthRedirectCookie();
          window.sessionStorage.removeItem(OAUTH_IN_FLIGHT_KEY);
          window.location.replace("/auth?mode=reset");
          return;
        } catch (error) {
          const reason =
            error instanceof Error ? error.message : "Password recovery failed";
          redirectToAuthError(reason);
          return;
        }
      }

      if (hashAccessToken && hashRefreshToken) {
        try {
          setMessageKey("callbackVerifying");
          const { error } = await supabase.auth.setSession({
            access_token: hashAccessToken,
            refresh_token: hashRefreshToken,
          });

          if (error) {
            redirectToAuthError(error.message);
            return;
          }

          clearAuthRedirectCookie();
          window.sessionStorage.removeItem(OAUTH_IN_FLIGHT_KEY);
          window.location.replace(
            hashType === "recovery"
              ? "/auth?mode=reset"
              : buildPostAuthPath(
                  (await supabase.auth.getUser()).data.user,
                  safeRedirect
                )
          );
          return;
        } catch (error) {
          const reason =
            error instanceof Error ? error.message : "Auth callback failed";
          redirectToAuthError(reason);
          return;
        }
      }

      if (!code) {
        redirectToAuthError();
        return;
      }

      if (!beginAuthCodeExchange(code)) {
        handleDuplicateExchange();
        return;
      }

      try {
        setMessageKey("callbackVerifying");

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

        if (
          safeRedirect === "/auth?mode=reset" ||
          safeRedirect.startsWith("/auth?mode=reset&")
        ) {
          clearAuthRedirectCookie();
          window.sessionStorage.removeItem(OAUTH_IN_FLIGHT_KEY);
          window.location.replace("/auth?mode=reset");
          return;
        }

        redirectAfterSession(exchangeResult.user);
      } catch (error) {
        failAuthCodeExchange(code);
        const reason =
          error instanceof Error ? error.message : "OAuth callback failed";
        redirectToAuthError(reason);
      }
    })();
  }, [searchParams]);

  return <AuthCallbackScreen messageKey={messageKey} />;
}
