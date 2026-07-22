import { NextResponse } from "next/server";
import { resolveUserProfile } from "@/lib/auth-profile";
import {
  isValidEmail,
  isValidWebsite,
  normalizeSupportEmail,
  normalizeTwitterHandle,
  normalizeWebsite,
  PROFILE_LIMITS,
  resolveRoleFromPreferences,
} from "@/lib/profile-settings";
import { getCountryCodeFromRequest } from "@/lib/request-geo";
import { createAuthServerClient } from "@/lib/supabase/server-auth";
import { createServerSupabase } from "@/lib/supabase-server";
import { syncUserCountryFromRequest } from "@/lib/chat-player-profile-service";
import {
  normalizeCreatorUsername,
  validateCreatorUsername,
} from "@/lib/creator-username";
import {
  normalizeProfileShowcaseTags,
  parseProfileShowcaseTags,
} from "@/lib/profile-showcase-tags";
import { isMissingProfilesRelation } from "@/lib/profiles-access";

type ProfilePatchBody = {
  display_name?: string;
  username?: string;
  bio?: string;
  website?: string;
  twitter?: string;
  playing_games?: boolean;
  developing_games?: boolean;
  support_email?: string;
  profile_public?: boolean;
  show_in_leaderboard?: boolean;
  profile_showcase_tags?: string[];
};

export async function GET(request: Request) {
  try {
    const supabase = await createAuthServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ profile: null, email: null });
    }

    let countryCode =
      typeof user.user_metadata?.country_code === "string"
        ? user.user_metadata.country_code.trim().toUpperCase()
        : null;

    const detectedCountry = getCountryCodeFromRequest(request);
    if (detectedCountry && countryCode !== detectedCountry) {
      void syncUserCountryFromRequest(
        createServerSupabase(),
        user.id,
        request
      ).catch(() => undefined);
      countryCode = detectedCountry;
    }

    const profile = await resolveUserProfile(supabase, user);
    const hasPassword =
      user.identities?.some((identity) => identity.provider === "email") ?? false;

    return NextResponse.json({
      profile,
      email: user.email ?? null,
      hasPassword,
      countryCode,
    });
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
    const { sanitizePlainText } = await import("@/lib/sanitize-plain");
    const supabase = await createAuthServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "請先登入" }, { status: 401 });
    }

    const body = (await request.json()) as ProfilePatchBody;
    const currentProfile = await resolveUserProfile(supabase, user);

    const displayName = sanitizePlainText(
      body.display_name ?? currentProfile.display_name,
      PROFILE_LIMITS.displayName
    );
    const usernameRaw =
      body.username !== undefined
        ? normalizeCreatorUsername(body.username)
        : (currentProfile.username ?? "");
    const bioRaw =
      body.bio !== undefined
        ? sanitizePlainText(body.bio, PROFILE_LIMITS.bio)
        : (currentProfile.bio ?? "");
    const websiteRaw =
      body.website !== undefined
        ? sanitizePlainText(body.website, PROFILE_LIMITS.website)
        : (currentProfile.website ?? "");
    const twitterRaw =
      body.twitter !== undefined
        ? sanitizePlainText(body.twitter, PROFILE_LIMITS.twitter)
        : (currentProfile.twitter ?? "");
    const supportEmailRaw =
      body.support_email !== undefined
        ? sanitizePlainText(body.support_email, PROFILE_LIMITS.supportEmail)
        : (currentProfile.support_email ?? "");

    if (!displayName) {
      return NextResponse.json({ error: "請輸入顯示名稱" }, { status: 400 });
    }

    let username: string | null = null;
    if (usernameRaw) {
      const usernameResult = validateCreatorUsername(usernameRaw);
      if (!usernameResult.ok) {
        return NextResponse.json({ error: usernameResult.error }, { status: 400 });
      }
      username = usernameResult.username;

      const { data: gameConflict } = await supabase
        .from("games")
        .select("id")
        .eq("slug", username)
        .maybeSingle();
      if (gameConflict) {
        return NextResponse.json(
          { error: "此網址名稱已被遊戲使用，請改用其他名稱" },
          { status: 409 }
        );
      }

      const { data: profileConflict } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", username)
        .neq("id", user.id)
        .maybeSingle();
      if (profileConflict) {
        return NextResponse.json(
          { error: "此創作者網址已被使用，請改用其他名稱" },
          { status: 409 }
        );
      }
    }

    const bio = bioRaw || "";
    const website = websiteRaw ? normalizeWebsite(websiteRaw) : "";
    const twitter = twitterRaw ? normalizeTwitterHandle(twitterRaw) : "";
    const supportEmail = supportEmailRaw
      ? normalizeSupportEmail(supportEmailRaw)
      : "";

    if (website && !isValidWebsite(website)) {
      return NextResponse.json({ error: "個人網站網址格式不正確" }, { status: 400 });
    }

    if (supportEmail && !isValidEmail(supportEmail)) {
      return NextResponse.json({ error: "支援信箱格式不正確" }, { status: 400 });
    }

    const playingGames =
      body.playing_games !== undefined
        ? body.playing_games !== false
        : currentProfile.playing_games;
    const developingGames =
      body.developing_games !== undefined
        ? body.developing_games === true
        : currentProfile.developing_games;
    const profilePublic =
      body.profile_public !== undefined
        ? body.profile_public !== false
        : currentProfile.profile_public;
    const showInLeaderboard =
      body.show_in_leaderboard !== undefined
        ? body.show_in_leaderboard !== false
        : currentProfile.show_in_leaderboard;
    const profileShowcaseTags =
      body.profile_showcase_tags !== undefined
        ? normalizeProfileShowcaseTags(parseProfileShowcaseTags(body.profile_showcase_tags))
        : currentProfile.profile_showcase_tags;

    const isAdmin = user.user_metadata?.role === "admin";
    const role = isAdmin
      ? "admin"
      : resolveRoleFromPreferences(developingGames);

    const metadata = {
      display_name: displayName,
      bio: bio || null,
      website: website || null,
      twitter: twitter || null,
      playing_games: playingGames,
      developing_games: developingGames,
      profile_public: profilePublic,
      show_in_leaderboard: showInLeaderboard,
      profile_showcase_tags: profileShowcaseTags,
      role,
    };

    const { error: authError } = await supabase.auth.updateUser({
      data: metadata,
    });

    if (authError) {
      throw new Error(authError.message);
    }

    // authenticated 僅有 display_name / username / bio / support_email 等欄位更新權限，
    // 不可帶 role（否則整筆 update 會因欄位未授權而失敗）。
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        display_name: displayName,
        username,
        support_email: supportEmail || null,
        bio: bio || null,
      })
      .eq("id", user.id);

    if (profileError && !isMissingProfilesRelation(profileError)) {
      throw new Error(profileError.message);
    }

    // role 需由 service role 同步，供 RLS（profiles.role = creator）使用
    if (!isAdmin && !isMissingProfilesRelation(profileError)) {
      const admin = createServerSupabase();
      const { error: roleError } = await admin
        .from("profiles")
        .update({ role: resolveRoleFromPreferences(developingGames) })
        .eq("id", user.id);
      if (roleError && !isMissingProfilesRelation(roleError)) {
        throw new Error(roleError.message);
      }
    }

    const {
      data: { user: updatedUser },
    } = await supabase.auth.getUser();

    if (!updatedUser) {
      return NextResponse.json({ error: "請先登入" }, { status: 401 });
    }

    const profile = await resolveUserProfile(supabase, updatedUser);
    const hasPassword =
      updatedUser.identities?.some((identity) => identity.provider === "email") ??
      false;

    return NextResponse.json({
      profile,
      email: updatedUser.email ?? null,
      hasPassword,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "更新個人資料失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
