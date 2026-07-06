import { NextResponse } from "next/server";
import { loadDashboardAnalyticsForRequest } from "@/lib/dashboard-analytics-server";
import type { CreatorGameRecord } from "@/lib/creator-games";
import { createAuthServerClient } from "@/lib/supabase/server-auth";
import { createServerSupabase } from "@/lib/supabase-server";
import { resolveUserRole, hasCreatorDashboardAccess } from "@/lib/auth-profile";

export async function GET(request: Request) {
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
      return NextResponse.json({ error: "需要創作者身分" }, { status: 403 });
    }

    const supabase = createServerSupabase();
    const { data: games, error } = await supabase
      .from("games")
      .select(
        "id, title, description, category, cover_url, game_url, creator_id, created_at, plays_count, rating_avg, publish_status, tips_enabled, suggested_tip_amount"
      )
      .eq("creator_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[dashboard/analytics] games query:", error.message);
      throw new Error("讀取分析資料失敗");
    }

    const url = new URL(request.url);
    const result = await loadDashboardAnalyticsForRequest(
      url.searchParams.get("scope"),
      url.searchParams.get("range"),
      (games ?? []) as CreatorGameRecord[]
    );

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ payload: result.payload });
  } catch (error) {
    const message = error instanceof Error ? error.message : "讀取分析資料失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
