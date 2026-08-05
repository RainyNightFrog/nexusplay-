import { NextResponse } from "next/server";
import { createAuthServerClient } from "@/lib/supabase/server-auth";
import { createServerSupabase } from "@/lib/supabase-server";
import { listPointsLeaderboard } from "@/lib/poker/economy-service";

export async function GET(request: Request) {
  try {
    const authClient = await createAuthServerClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    const url = new URL(request.url);
    const limit = Number(url.searchParams.get("limit") || 20);

    const supabase = createServerSupabase();
    const board = await listPointsLeaderboard(
      supabase,
      user?.id ?? null,
      Number.isFinite(limit) ? limit : 20,
    );
    return NextResponse.json(board);
  } catch (e) {
    const message = e instanceof Error ? e.message : "讀取排行榜失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
