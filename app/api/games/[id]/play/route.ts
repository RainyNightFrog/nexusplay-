import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  ANALYTICS_SESSION_COOKIE,
  trackAnalyticsEvent,
} from "@/lib/analytics-service";
import { incrementGamePlays } from "@/lib/games-service";
import { createAuthServerClient } from "@/lib/supabase/server-auth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const numericId = Number.parseInt(id, 10);

    if (Number.isNaN(numericId)) {
      return NextResponse.json({ error: "無效的遊戲 ID" }, { status: 400 });
    }

    await incrementGamePlays(numericId);

    const cookieStore = await cookies();
    const sessionId = cookieStore.get(ANALYTICS_SESSION_COOKIE)?.value?.trim();

    if (sessionId) {
      let userId: string | null = null;
      try {
        const supabase = await createAuthServerClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        userId = user?.id ?? null;
      } catch {
        userId = null;
      }

      const locale = new URL(request.url).searchParams.get("locale");

      await trackAnalyticsEvent({
        eventType: "game_play",
        sessionId,
        gameId: numericId,
        path: `/game/${numericId}`,
        userId,
        locale,
      }).catch(() => undefined);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "更新遊玩次數失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
