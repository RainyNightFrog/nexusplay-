import { NextResponse } from "next/server";
import { resolveUserRole, hasCreatorDashboardAccess } from "@/lib/auth-profile";
import { createAuthServerClient } from "@/lib/supabase/server-auth";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const authClient = await createAuthServerClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "請先登入" }, { status: 401 });
    }

    const role = await resolveUserRole(authClient, user);

    if (!hasCreatorDashboardAccess(user, role)) {
      return NextResponse.json(
        { error: "需要創作者身分才能上傳遊戲" },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const { uploadCreatorGameFromFormData } = await import(
      "@/lib/game-upload-service"
    );
    const result = await uploadCreatorGameFromFormData({
      creatorId: user.id,
      formData,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ game: result.game });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "上傳過程發生未知錯誤";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
