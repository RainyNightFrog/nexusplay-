import { NextResponse } from "next/server";
import { resolveUserProfile } from "@/lib/auth-profile";
import { startConnectOnboarding } from "@/lib/creator-payout-service";
import { createAuthServerClient } from "@/lib/supabase/server-auth";

export async function POST(request: Request) {
  try {
    const supabase = await createAuthServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      return NextResponse.json({ error: "請先登入" }, { status: 401 });
    }

    const profile = await resolveUserProfile(supabase, user);
    if (profile.role !== "creator" && !profile.is_admin) {
      return NextResponse.json({ error: "需要創作者身分" }, { status: 403 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      locale?: string;
      returnTo?: "settings" | "dashboard" | "upload" | "edit";
      gameId?: number;
    };
    const origin = new URL(request.url).origin;

    const result = await startConnectOnboarding({
      userId: user.id,
      email: user.email,
      displayName: profile.display_name,
      origin,
      locale: body.locale,
      returnTo: body.returnTo,
      gameId:
        typeof body.gameId === "number" && Number.isFinite(body.gameId)
          ? body.gameId
          : undefined,
    });

    if (result.mode === "preview") {
      return NextResponse.json({
        mode: "preview",
        message: "Stripe 尚未設定，目前為預覽模式",
      });
    }

    return NextResponse.json({ mode: "live", url: result.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "啟動收款設定失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
