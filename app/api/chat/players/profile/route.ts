import { NextResponse } from "next/server";
import { resolveAdminAccess } from "@/lib/admin-auth";
import {
  getChatPlayerPublicProfile,
  syncUserCountryFromRequest,
} from "@/lib/chat-player-profile-service";
import { createAuthServerClient } from "@/lib/supabase/server-auth";
import { createServerSupabase } from "@/lib/supabase-server";
import {
  SERVER_QUERY_TIMEOUT_MS,
  isTimeoutError,
  withTimeout,
} from "@/lib/with-timeout";

export async function GET(request: Request) {
  try {
    let user: Awaited<
      ReturnType<
        Awaited<ReturnType<typeof createAuthServerClient>>["auth"]["getUser"]
      >
    >["data"]["user"] = null;

    try {
      const authClient = await createAuthServerClient();
      const result = await authClient.auth.getUser();
      if (!result.error) {
        user = result.data.user;
      }
    } catch {
      // Session JWT 驗證失敗時仍允許讀取公開玩家卡
      user = null;
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId")?.trim() || null;
    const virtualPlayerId = searchParams.get("virtualPlayerId")?.trim() || null;

    if (!userId && !virtualPlayerId) {
      return NextResponse.json({ error: "缺少玩家識別" }, { status: 400 });
    }

    const supabase = createServerSupabase();

    if (user && userId && userId === user.id) {
      try {
        await syncUserCountryFromRequest(supabase, user.id, request);
      } catch {
        // 地區同步失敗不影響玩家卡
      }
    }

    const profile = await withTimeout(
      getChatPlayerPublicProfile(supabase, {
        userId,
        virtualPlayerId,
        viewerUserId: user?.id,
        viewerIsAdmin: await resolveAdminAccess(user),
      }),
      SERVER_QUERY_TIMEOUT_MS,
      "getChatPlayerPublicProfile"
    );

    if (!profile) {
      return NextResponse.json({ error: "找不到此玩家" }, { status: 404 });
    }

    return NextResponse.json({ profile });
  } catch (error) {
    const raw = error instanceof Error ? error.message : "讀取玩家資料失敗";
    const lower = raw.toLowerCase();
    const isAuthNoise =
      lower.includes("invalid jwt") ||
      lower.includes("jwt kid") ||
      lower.includes("unrecognized jwt") ||
      lower.includes("unable to parse or verify");
    if (isTimeoutError(error)) {
      return NextResponse.json(
        { error: "暫時無法讀取玩家資料，請稍後再試" },
        { status: 503 }
      );
    }
    if (isAuthNoise) {
      console.warn(`[chat/players/profile] auth noise suppressed: ${raw}`);
      return NextResponse.json(
        { error: "暫時無法讀取玩家資料，請稍後再試" },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: raw }, { status: 500 });
  }
}
