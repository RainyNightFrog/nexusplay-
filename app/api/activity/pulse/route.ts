import { NextResponse } from "next/server";
import { ACTIVITY_PULSE_SECONDS } from "@/lib/platform-leaderboard";
import { pulseUserActivity } from "@/lib/platform-leaderboard-service";
import { createAuthServerClient } from "@/lib/supabase/server-auth";

export async function POST(request: Request) {
  try {
    const authClient = await createAuthServerClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "請先登入" }, { status: 401 });
    }

    const body = (await request.json()) as {
      onlineSeconds?: unknown;
      playSeconds?: unknown;
    };

    const onlineSeconds =
      typeof body.onlineSeconds === "number" && Number.isFinite(body.onlineSeconds)
        ? Math.max(0, Math.min(Math.floor(body.onlineSeconds), ACTIVITY_PULSE_SECONDS))
        : ACTIVITY_PULSE_SECONDS;

    const playSeconds =
      typeof body.playSeconds === "number" && Number.isFinite(body.playSeconds)
        ? Math.max(0, Math.min(Math.floor(body.playSeconds), ACTIVITY_PULSE_SECONDS))
        : 0;

    await pulseUserActivity(
      authClient,
      onlineSeconds,
      Math.min(playSeconds, onlineSeconds)
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "更新活躍度失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
