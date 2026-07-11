import { NextResponse } from "next/server";
import { isAdminUser } from "@/lib/admin-auth";
import { getPlatformLeaderboards } from "@/lib/platform-leaderboard-service";
import {
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from "@/lib/rate-limit";
import { createAuthServerClient } from "@/lib/supabase/server-auth";
import { createServerSupabase } from "@/lib/supabase-server";

export async function GET(request: Request) {
  try {
    const ip = getClientIp(request);
    const limit = checkRateLimit(`leaderboards:get:${ip}`, 60, 60_000);
    if (!limit.allowed) {
      return rateLimitResponse(limit.retryAfterSec);
    }

    let currentUserId: string | null = null;
    let viewerIsAdmin = false;

    try {
      const authClient = await createAuthServerClient();
      const {
        data: { user },
      } = await authClient.auth.getUser();
      currentUserId = user?.id ?? null;
      viewerIsAdmin = isAdminUser(user);
    } catch {
      currentUserId = null;
    }

    const data = await getPlatformLeaderboards(
      createServerSupabase(),
      currentUserId,
      viewerIsAdmin
    );

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "讀取排行榜失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
