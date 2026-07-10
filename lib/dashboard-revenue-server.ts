import { resolveUserProfile, hasCreatorDashboardAccess } from "@/lib/auth-profile";
import { fetchCreatorAnalyticsEvents } from "@/lib/dashboard-analytics-server";
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

const TREND_DAY_OPTIONS = [7, 14, 30] as const;
export type RevenueTrendDays = (typeof TREND_DAY_OPTIONS)[number];

function parseScope(value: string | null): AnalyticsScope {
  if (!value || value === "all") return ALL_GAMES_SCOPE;
  const numeric = Number.parseInt(value, 10);
  return Number.isNaN(numeric) ? ALL_GAMES_SCOPE : numeric;
}

function parseTrendDays(value: string | null): RevenueTrendDays {
  const numeric = Number.parseInt(value ?? "", 10);
  if (numeric === 7 || numeric === 14 || numeric === 30) return numeric;
  return 14;
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
      "id, game_id, payer_id, amount_usd, creator_net_usd, status, created_at, public_anonymous"
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
    .select("id, display_name, player_number")
    .in("id", payerIds);

  const payerMap = new Map(
    (payers ?? []).map((payer) => [
      payer.id,
      {
        displayName: payer.display_name as string,
        playerNumber:
          typeof payer.player_number === "number"
            ? payer.player_number
            : payer.player_number != null
              ? Number(payer.player_number) || null
              : null,
      },
    ])
  );

  return tips.map((tip) => {
    const payer = payerMap.get(tip.payer_id);
    return {
      ...tip,
      payer_name: payer?.displayName ?? null,
      payer_player_number: payer?.playerNumber ?? null,
      game_title: gameTitleMap.get(tip.game_id),
    };
  }) as TipRecordRow[];
}

export async function getCreatorDashboardRevenue(params: {
  userId: string;
  scope: AnalyticsScope;
  games: CreatorGameRecord[];
  trendDays?: RevenueTrendDays;
}): Promise<DashboardRevenueAnalytics> {
  const trendDays = params.trendDays ?? 14;
  const gameIds = params.games.map((game) => game.id);
  const [tips, playEvents] = await Promise.all([
    fetchCreatorTips(params.userId, params.games),
    fetchCreatorAnalyticsEvents(gameIds),
  ]);

  if (tips.length === 0) {
    return buildEmptyDashboardRevenue(params.games, params.scope, trendDays);
  }

  return buildDashboardRevenueFromTips(
    params.scope,
    params.games,
    tips,
    playEvents,
    trendDays
  );
}

export async function loadDashboardRevenueForRequest(
  scopeParam: string | null,
  trendDaysParam: string | null,
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
  const trendDays = parseTrendDays(trendDaysParam);
  const revenue = await getCreatorDashboardRevenue({
    userId: user.id,
    scope,
    games,
    trendDays,
  });

  return { revenue };
}
