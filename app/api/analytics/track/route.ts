import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  ANALYTICS_SESSION_COOKIE,
  trackAnalyticsEvent,
  type AnalyticsEventType,
} from "@/lib/analytics-service";
import { createAuthServerClient } from "@/lib/supabase/server-auth";

const VALID_EVENT_TYPES = new Set<AnalyticsEventType>(["page_view", "game_play"]);

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get(ANALYTICS_SESSION_COOKIE)?.value?.trim();

    if (!sessionId) {
      return NextResponse.json({ error: "缺少訪客識別" }, { status: 400 });
    }

    const body = (await request.json()) as {
      eventType?: AnalyticsEventType;
      path?: string;
      gameId?: number;
      locale?: string;
    };

    if (!body.eventType || !VALID_EVENT_TYPES.has(body.eventType)) {
      return NextResponse.json({ error: "無效的事件類型" }, { status: 400 });
    }

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

    await trackAnalyticsEvent({
      eventType: body.eventType,
      sessionId,
      path: body.path ?? null,
      gameId:
        typeof body.gameId === "number" && Number.isFinite(body.gameId)
          ? body.gameId
          : null,
      userId,
      locale: body.locale ?? null,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "記錄人流失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
