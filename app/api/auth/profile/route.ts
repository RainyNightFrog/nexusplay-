import { NextResponse } from "next/server";
import { resolveUserProfile } from "@/lib/auth-profile";
import {
  isValidWebsite,
  normalizeTwitterHandle,
  normalizeWebsite,
  PROFILE_LIMITS,
  resolveRoleFromPreferences,
} from "@/lib/profile-settings";
import { sanitizePlainText } from "@/lib/sanitize";
import { createAuthServerClient } from "@/lib/supabase/server-auth";

export async function GET() {
  try {
    const supabase = await createAuthServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ profile: null, email: null });
    }

    const profile = await resolveUserProfile(supabase, user);
    return NextResponse.json({ profile, email: user.email ?? null });
  } catch (error) {
    const message = error instanceof Error ? error.message : "讀取個人資料失敗";
    return NextResponse.json(
      { error: message, profile: null, email: null },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createAuthServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "請先登入" }, { status: 401 });
    }

    const body = (await request.json()) as {
      display_name?: string;
      website?: string;
      twitter?: string;
      playing_games?: boolean;
      developing_games?: boolean;
    };

    const currentProfile = await resolveUserProfile(supabase, user);

    const displayName = sanitizePlainText(
      body.display_name ?? currentProfile.display_name,
      PROFILE_LIMITS.displayName
    );
    const websiteRaw =
      body.website !== undefined
        ? sanitizePlainText(body.website, PROFILE_LIMITS.website)
        : (currentProfile.website ?? "");
    const twitterRaw =
      body.twitter !== undefined
        ? sanitizePlainText(body.twitter, PROFILE_LIMITS.twitter)
        : (currentProfile.twitter ?? "");

    if (!displayName) {
      return NextResponse.json({ error: "請輸入顯示名稱" }, { status: 400 });
    }

    const website = websiteRaw ? normalizeWebsite(websiteRaw) : "";
    const twitter = twitterRaw ? normalizeTwitterHandle(twitterRaw) : "";

    if (website && !isValidWebsite(website)) {
      return NextResponse.json({ error: "個人網站網址格式不正確" }, { status: 400 });
    }

    const playingGames =
      body.playing_games !== undefined
        ? body.playing_games !== false
        : currentProfile.playing_games;
    const developingGames =
      body.developing_games !== undefined
        ? body.developing_games === true
        : currentProfile.developing_games;
    const role = resolveRoleFromPreferences(developingGames);

    const metadata = {
      display_name: displayName,
      website: website || null,
      twitter: twitter || null,
      playing_games: playingGames,
      developing_games: developingGames,
      role,
    };

    const { error: authError } = await supabase.auth.updateUser({
      data: metadata,
    });

    if (authError) {
      throw new Error(authError.message);
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        display_name: displayName,
        role,
      })
      .eq("id", user.id);

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
    return NextResponse.json({ profile, email: updatedUser.email ?? null });
  } catch (error) {
    const message = error instanceof Error ? error.message : "更新個人資料失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
