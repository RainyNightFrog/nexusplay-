import { NextResponse } from "next/server";
import { isAdminUser } from "@/lib/admin-auth";
import {
  getChatPlayerPublicProfile,
  syncUserCountryFromRequest,
} from "@/lib/chat-player-profile-service";
import { createAuthServerClient } from "@/lib/supabase/server-auth";
import { createServerSupabase } from "@/lib/supabase-server";

export async function GET(request: Request) {
  try {
    const authClient = await createAuthServerClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId")?.trim() || null;
    const virtualPlayerId = searchParams.get("virtualPlayerId")?.trim() || null;

    if (!userId && !virtualPlayerId) {
      return NextResponse.json({ error: "缺少玩家識別" }, { status: 400 });
    }

    const supabase = createServerSupabase();

    if (user && userId && userId === user.id) {
      await syncUserCountryFromRequest(supabase, user.id, request);
    }

    const profile = await getChatPlayerPublicProfile(supabase, {
      userId,
      virtualPlayerId,
      viewerUserId: user?.id,
      viewerIsAdmin: isAdminUser(user),
    });

    if (!profile) {
      return NextResponse.json({ error: "找不到此玩家" }, { status: 404 });
    }

    return NextResponse.json({ profile });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "讀取玩家資料失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
