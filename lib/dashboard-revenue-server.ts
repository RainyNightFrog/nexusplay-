import { resolveUserProfile, hasCreatorDashboardAccess } from "@/lib/auth-profile";
import {
  buildDashboardRevenueFromTips,
  buildEmptyDashboardRevenue,
  type TipRecordRow,
} from "@/lib/dashboard-revenue-builder";
import type { DashboardRevenueAnalytics } from "@/lib/dashboard-revenue-types";
import type { AnalyticsScope } from "@/lib/dashboard-analytics";
import { ALL_GAMES_SCOPE } from "@/lib/dashboard-analytics";
import type { CreatorGameRecord } from "@/lib/creator-games";
import { createAuthServerClient } from "@/lib/supabase/server-auth";
import { createServerSupabase } from "@/lib/supabase-server";

function parseScope(value: string | null): AnalyticsScope {
  if (!value || value === "all") return ALL_GAMES_SCOPE;
  const numeric = Number.parseInt(value, 10);
  return Number.isNaN(numeric) ? ALL_GAMES_SCOPE : numeric;
}

async function fetchCreatorTips(
  creatorId: string,
  games: CreatorGameRecord[]
): Promise<TipRecordRow[]> {
  const gameIds = games.map((game) => game.id);
  if (gameIds.length === 0) return [];

  const gameTitleMap = new Map(games.map((game) => [game.id, game.title]));
  const supabase = createServerSupabase();

  const { data: tips, error } = await supabase
    .from("game_tips")
    .select(
      "id, game_id, payer_id, amount_usd, creator_net_usd, status, created_at"
    )
    .eq("creator_id", creatorId)
    .in("game_id", gameIds)
    .in("status", ["succeeded", "preview"])
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[dashboard/revenue] tips query:", error.message);
    throw new Error("讀取收益資料失敗");
  }

  if (!tips || tips.length === 0) return [];

  const payerIds = [...new Set(tips.map((tip) => tip.payer_id))];
  const { data: payers } = await supabase
    .from("profiles")
    .select("id, display_name")
    .in("id", payerIds);

  const payerMap = new Map(
    (payers ?? []).map((payer) => [payer.id, payer.display_name as string])
  );

  return tips.map((tip) => ({
    ...tip,
    payer_name: payerMap.get(tip.payer_id) ?? null,
    game_title: gameTitleMap.get(tip.game_id),
  })) as TipRecordRow[];
}

export async function getCreatorDashboardRevenue(params: {
  userId: string;
  scope: AnalyticsScope;
  games: CreatorGameRecord[];
}): Promise<DashboardRevenueAnalytics> {
  const tips = await fetchCreatorTips(params.userId, params.games);

  if (tips.length === 0) {
    return buildEmptyDashboardRevenue(params.games, params.scope);
  }

  return buildDashboardRevenueFromTips(params.scope, params.games, tips);
}

export async function loadDashboardRevenueForRequest(
  scopeParam: string | null,
  games: CreatorGameRecord[]
) {
  const authClient = await createAuthServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return { error: "請先登入", status: 401 as const };
  }

  const profile = await resolveUserProfile(authClient, user);
  if (!hasCreatorDashboardAccess(user, profile.role)) {
    return { error: "需要創作者身分", status: 403 as const };
  }

  const scope = parseScope(scopeParam);
  const revenue = await getCreatorDashboardRevenue({
    userId: user.id,
    scope,
    games,
  });

  return { revenue };
}
