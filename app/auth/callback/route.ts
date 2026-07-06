import { NextResponse, type NextRequest } from "next/server";
import { buildChooseRolePath, shouldSkipAccountIntent } from "@/lib/account-intent";
import {
  createAuthCallbackClient,
  resolveAuthRedirectBase,
} from "@/lib/supabase/route-auth";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const redirectTo = searchParams.get("redirect") ?? "/";
  const safeRedirect = redirectTo.startsWith("/") ? redirectTo : "/";
  const base = resolveAuthRedirectBase(request, origin);

  const redirectToAuthError = () =>
    NextResponse.redirect(`${base}/auth?error=callback`);

  if (!code) {
    return redirectToAuthError();
  }

  const { supabase, applyCookies } = createAuthCallbackClient(request);
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth/callback] exchangeCodeForSession:", error.message);
    const failUrl = new URL(`${base}/auth`, request.url);
    failUrl.searchParams.set("error", "callback");
    failUrl.searchParams.set("reason", error.message.slice(0, 180));
    return NextResponse.redirect(failUrl);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path =
    user && shouldSkipAccountIntent(user)
      ? safeRedirect
      : buildChooseRolePath(safeRedirect);

  const response = NextResponse.redirect(`${base}${path}`);
  applyCookies(response);
  return response;
}
