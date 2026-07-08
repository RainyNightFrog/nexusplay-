import { NextResponse } from "next/server";
import { loadDashboardRevenueForRequest } from "@/lib/dashboard-revenue-server";
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
      console.error("[dashboard/revenue] games query:", error.message);
      throw new Error("讀取收益資料失敗");
    }

    const scope = new URL(request.url).searchParams.get("scope");
    const trendDays = new URL(request.url).searchParams.get("trendDays");
    const result = await loadDashboardRevenueForRequest(
      scope,
      trendDays,
      (games ?? []) as CreatorGameRecord[]
    );

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ revenue: result.revenue });
  } catch (error) {
    const message = error instanceof Error ? error.message : "讀取收益資料失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
