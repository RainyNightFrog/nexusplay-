import { NextResponse } from "next/server";
import { accountIntentToProfile } from "@/lib/account-intent";
import { resolveUserProfile } from "@/lib/auth-profile";
import { isAdminUser } from "@/lib/admin-auth";
import { resolveRoleFromPreferences } from "@/lib/profile-settings";
import { createAuthServerClient } from "@/lib/supabase/server-auth";
import type { UserRole } from "@/lib/auth";

function parseIntent(value: unknown): UserRole | null {
  return value === "creator" || value === "player" ? value : null;
}

export async function POST(request: Request) {
  try {
    const supabase = await createAuthServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "請先登入" }, { status: 401 });
    }

    if (isAdminUser(user)) {
      const profile = await resolveUserProfile(supabase, user);
      return NextResponse.json({ profile, skipped: true });
    }

    const body = (await request.json()) as { intent?: unknown };
    const intent = parseIntent(body.intent);

    if (!intent) {
      return NextResponse.json(
        { error: "intent 必須為 player 或 creator" },
        { status: 400 }
      );
    }

    const currentProfile = await resolveUserProfile(supabase, user);
    const { developing_games, role } = accountIntentToProfile(intent);

    const metadata = {
      ...(user.user_metadata ?? {}),
      display_name: currentProfile.display_name,
      developing_games,
      role,
      account_intent_at: new Date().toISOString(),
    };

    const { error: authError } = await supabase.auth.updateUser({
      data: metadata,
    });

    if (authError) {
      throw new Error(authError.message);
    }

    const { error: profileError } = await supabase.from("profiles").upsert(
      {
        id: user.id,
        display_name: currentProfile.display_name,
        role: resolveRoleFromPreferences(developing_games),
      },
      { onConflict: "id" }
    );

    if (
      profileError &&
      profileError.code !== "PGRST205" &&
      !profileError.message.includes("profiles")
    ) {
      throw new Error(profileError.message);
    }

    const {
      data: { user: updatedUser },
    } = await supabase.auth.getUser();

    if (!updatedUser) {
      return NextResponse.json({ error: "請先登入" }, { status: 401 });
    }

    const profile = await resolveUserProfile(supabase, updatedUser);
    return NextResponse.json({ profile, intent });
  } catch (error) {
    const message = error instanceof Error ? error.message : "設定帳號身分失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
