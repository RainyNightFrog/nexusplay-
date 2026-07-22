import { NextResponse } from "next/server";
import { resolveUserProfile } from "@/lib/auth-profile";
import { isMissingProfilesRelation } from "@/lib/profiles-access";
import { PROFILE_LIMITS } from "@/lib/profile-settings";
import { createAuthServerClient } from "@/lib/supabase/server-auth";
import { createServerSupabase } from "@/lib/supabase-server";

const AVATARS_BUCKET = "avatars";
const VALID_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];

function extensionForType(contentType: string) {
  switch (contentType) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      return "jpg";
  }
}

export async function POST(request: Request) {
  try {
    const authClient = await createAuthServerClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "請先登入" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("avatar");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "請選擇頭像圖片" }, { status: 400 });
    }

    if (!VALID_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "頭像僅支援 .png、.jpg、.webp 格式" },
        { status: 400 }
      );
    }

    if (file.size > PROFILE_LIMITS.avatarBytes) {
      return NextResponse.json(
        { error: "頭像不可超過 2 MB" },
        { status: 400 }
      );
    }

    const supabase = createServerSupabase();
    const extension = extensionForType(file.type || "image/jpeg");
    const path = `${user.id}/avatar-${Date.now()}.${extension}`;
    const buffer = await file.arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from(AVATARS_BUCKET)
      .upload(path, buffer, {
        cacheControl: "3600",
        upsert: true,
        contentType: file.type || "image/jpeg",
      });

    if (uploadError) {
      throw new Error(`頭像上傳失敗：${uploadError.message}`);
    }

    const { data: publicData } = supabase.storage
      .from(AVATARS_BUCKET)
      .getPublicUrl(path);

    const avatarUrl = publicData.publicUrl;

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
    const message = error instanceof Error ? error.message : "頭像上傳失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
