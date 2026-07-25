import { NextResponse } from "next/server";
import { resolveUserProfile } from "@/lib/auth-profile";
import { isMissingProfilesRelation } from "@/lib/profiles-access";
import { createAuthServerClient } from "@/lib/supabase/server-auth";
import { resolveSelectableAvatarPresetUrl } from "@/lib/virtual-player-avatar";

export async function POST(request: Request) {
  try {
    const authClient = await createAuthServerClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "請先登入" }, { status: 401 });
    }

    const body = (await request.json()) as { presetId?: unknown };
    const presetId =
      typeof body.presetId === "string" ? body.presetId.trim() : "";

    if (!presetId) {
      return NextResponse.json({ error: "請選擇預設頭像" }, { status: 400 });
    }

    const avatarUrl = resolveSelectableAvatarPresetUrl(presetId, 256);
    if (!avatarUrl) {
      return NextResponse.json({ error: "無效的預設頭像" }, { status: 400 });
    }

    const { error: authError } = await authClient.auth.updateUser({
      data: { avatar_url: avatarUrl },
    });

    if (authError) {
      throw new Error(authError.message);
    }

    const { error: profileError } = await authClient
      .from("profiles")
      .update({ avatar_url: avatarUrl })
      .eq("id", user.id);

    if (profileError && !isMissingProfilesRelation(profileError)) {
      throw new Error(profileError.message);
    }

    const {
      data: { user: updatedUser },
    } = await authClient.auth.getUser();

    if (!updatedUser) {
      return NextResponse.json({ error: "請先登入" }, { status: 401 });
    }

    const profile = await resolveUserProfile(authClient, updatedUser);
    return NextResponse.json({ avatar_url: avatarUrl, profile });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "預設頭像套用失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
