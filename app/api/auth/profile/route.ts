import { NextResponse } from "next/server";
import { resolveUserProfile } from "@/lib/auth-profile";
import { sanitizePlainText } from "@/lib/sanitize";
import { createAuthServerClient } from "@/lib/supabase/server-auth";

const MAX_DISPLAY_NAME_LENGTH = 40;

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

    const body = (await request.json()) as { display_name?: string };
    const displayName = sanitizePlainText(
      body.display_name ?? "",
      MAX_DISPLAY_NAME_LENGTH
    );

    if (!displayName) {
      return NextResponse.json({ error: "請輸入顯示名稱" }, { status: 400 });
    }

    const { error: authError } = await supabase.auth.updateUser({
      data: { display_name: displayName },
    });

    if (authError) {
      throw new Error(authError.message);
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .update({ display_name: displayName })
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
