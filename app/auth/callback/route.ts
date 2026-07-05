import { NextResponse } from "next/server";
import { buildChooseRolePath, shouldSkipAccountIntent } from "@/lib/account-intent";
import { createAuthServerClient } from "@/lib/supabase/server-auth";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const redirectTo = searchParams.get("redirect") ?? "/";

  if (code) {
    const supabase = await createAuthServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user && shouldSkipAccountIntent(user)) {
        return NextResponse.redirect(`${origin}${redirectTo}`);
      }

      return NextResponse.redirect(`${origin}${buildChooseRolePath(redirectTo)}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth?error=callback`);
}
