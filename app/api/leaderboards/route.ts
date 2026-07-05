import { NextResponse } from "next/server";
import { getPlatformLeaderboards } from "@/lib/platform-leaderboard-service";
import { createAuthServerClient } from "@/lib/supabase/server-auth";
import { createServerSupabase } from "@/lib/supabase-server";

export async function GET() {
  try {
    let currentUserId: string | null = null;

    try {
      const authClient = await createAuthServerClient();
      const {
        data: { user },
      } = await authClient.auth.getUser();
      currentUserId = user?.id ?? null;
    } catch {
      currentUserId = null;
    }

    const data = await getPlatformLeaderboards(
      createServerSupabase(),
      currentUserId
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
