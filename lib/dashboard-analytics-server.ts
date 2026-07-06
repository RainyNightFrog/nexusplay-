import { resolveUserProfile, hasCreatorDashboardAccess } from "@/lib/auth-profile";
import {
  buildDashboardAnalyticsFromEvents,
  type AnalyticsEventRow,
} from "@/lib/dashboard-analytics-builder";
import type {
  AnalyticsScope,
  DashboardAnalytics,
  DashboardHighlight,
  HighlightTimeRange,
} from "@/lib/dashboard-analytics";
import { ALL_GAMES_SCOPE, HIGHLIGHT_TIME_RANGES } from "@/lib/dashboard-analytics";
import type { CreatorGameRecord } from "@/lib/creator-games";
import { createAuthServerClient } from "@/lib/supabase/server-auth";
import { createServerSupabase } from "@/lib/supabase-server";

export type DashboardAnalyticsPayload = {
  analytics: DashboardAnalytics;
  highlights: DashboardHighlight[];
  dataSource: "live";
};

function parseScope(value: string | null): AnalyticsScope {
  if (!value || value === "all") return ALL_GAMES_SCOPE;
  const numeric = Number.parseInt(value, 10);
  return Number.isNaN(numeric) ? ALL_GAMES_SCOPE : numeric;
}

function parseHighlightRange(value: string | null): HighlightTimeRange {
  if (value && HIGHLIGHT_TIME_RANGES.includes(value as HighlightTimeRange)) {
    return value as HighlightTimeRange;
  }
  return "week";
}

async function fetchCreatorAnalyticsEvents(
  gameIds: number[]
): Promise<AnalyticsEventRow[]> {
  if (gameIds.length === 0) return [];

  const supabase = createServerSupabase();
  const start = new Date();
  start.setDate(start.getDate() - 30);
  start.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("analytics_events")
    .select("event_type, game_id, session_id, created_at")
    .in("game_id", gameIds)
    .gte("created_at", start.toISOString())
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[dashboard/analytics] events query:", error.message);
    throw new Error("讀取分析資料失敗");
  }

  return (data ?? []) as AnalyticsEventRow[];
}

export async function getCreatorDashboardAnalytics(params: {
  scope: AnalyticsScope;
  games: CreatorGameRecord[];
  highlightRange: HighlightTimeRange;
}): Promise<DashboardAnalyticsPayload> {
  const gameIds = params.games.map((game) => game.id);
  const events = await fetchCreatorAnalyticsEvents(gameIds);
  const built = buildDashboardAnalyticsFromEvents({
    scope: params.scope,
    games: params.games,
    events,
    highlightRange: params.highlightRange,
  });

  return {
    analytics: built.analytics,
    highlights: built.highlights,
    dataSource: "live",
  };
}

export async function loadDashboardAnalyticsForRequest(
  scopeParam: string | null,
  highlightRangeParam: string | null,
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
  const highlightRange = parseHighlightRange(highlightRangeParam);
  const payload = await getCreatorDashboardAnalytics({
    scope,
    games,
    highlightRange,
  });

  return { payload };
}
