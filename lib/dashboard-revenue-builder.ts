import type { CreatorGameRecord } from "@/lib/creator-games";
import type { AnalyticsScope } from "@/lib/dashboard-analytics";
import { ALL_GAMES_SCOPE } from "@/lib/dashboard-analytics";
import type { AnalyticsEventRow } from "@/lib/dashboard-analytics-builder";
import type {
  DashboardRevenueAnalytics,
  GameRevenueCore,
  RevenueBreakdownRow,
  RevenueStat,
  RevenueTrendPoint,
  RecentTipRow,
} from "@/lib/dashboard-revenue-types";

export type TipRecordRow = {
  id: string;
  game_id: number;
  payer_id: string;
  amount_usd: number | string;
  creator_net_usd: number | string;
  status: string;
  created_at: string;
  game_title?: string;
  payer_name?: string | null;
  payer_player_number?: number | null;
  public_anonymous?: boolean;
};

function toNumber(value: number | string | null | undefined) {
  if (typeof value === "number") return value;
  return Number.parseFloat(String(value ?? 0)) || 0;
}

function formatMoney(value: number) {
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatPeriodChange(current: number, previous: number) {
  if (current === 0 && previous === 0) return "—";
  if (previous === 0) return "+100%";
  const change = ((current - previous) / previous) * 100;
  return `${change >= 0 ? "+" : ""}${change.toFixed(1)}%`;
}

function buildTrendPoints(
  tips: TipRecordRow[],
  days: 7 | 14 | 30 = 14
): RevenueTrendPoint[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const buckets: RevenueTrendPoint[] = [];

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const day = new Date(today);
    day.setDate(today.getDate() - offset);
    const nextDay = new Date(day);
    nextDay.setDate(day.getDate() + 1);

    const dayTips = tips.filter((tip) => {
      const created = new Date(tip.created_at);
      return created >= day && created < nextDay;
    });

    const tipsCount = dayTips.length;
    const amount =
      Math.round(
        dayTips.reduce((sum, tip) => sum + toNumber(tip.creator_net_usd), 0) *
          100
      ) / 100;

    buckets.push({
      date: `${day.getMonth() + 1}/${day.getDate()}`,
      tips: tipsCount,
      amount,
    });
  }

  return buckets;
}

function filterEventsByScope(
  events: AnalyticsEventRow[],
  scope: AnalyticsScope,
  gameIds: Set<number>
) {
  return events.filter((event) => {
    if (!event.game_id || !gameIds.has(event.game_id)) return false;
    if (scope === ALL_GAMES_SCOPE) return true;
    return event.game_id === scope;
  });
}

function tipsInRange(tips: TipRecordRow[], start: Date, end: Date) {
  return tips.filter((tip) => {
    const created = new Date(tip.created_at);
    return created >= start && created <= end;
  });
}

function countPlaysInRange(
  events: AnalyticsEventRow[],
  scope: AnalyticsScope,
  gameIds: Set<number>,
  start: Date,
  end: Date
) {
  return filterEventsByScope(events, scope, gameIds).filter((event) => {
    if (event.event_type !== "game_play") return false;
    const created = new Date(event.created_at);
    return created >= start && created <= end;
  }).length;
}

function filterTipsByScope(
  tips: TipRecordRow[],
  scope: AnalyticsScope,
  gameIds: Set<number>
) {
  return tips.filter((tip) => {
    if (!gameIds.has(tip.game_id)) return false;
    if (scope === ALL_GAMES_SCOPE) return true;
    return tip.game_id === scope;
  });
}

function sumNetInRange(tips: TipRecordRow[], start: Date, end: Date) {
  return tips.reduce((sum, tip) => {
    const created = new Date(tip.created_at);
    if (created < start || created >= end) return sum;
    return sum + toNumber(tip.creator_net_usd);
  }, 0);
}

function buildStats(
  core: GameRevenueCore,
  tips: TipRecordRow[],
  playEvents: AnalyticsEventRow[],
  scope: AnalyticsScope,
  gameIds: Set<number>
): RevenueStat[] {
  const now = new Date();
  const currentStart = new Date(now);
  currentStart.setDate(now.getDate() - 7);
  const previousStart = new Date(now);
  previousStart.setDate(now.getDate() - 14);

  const currentTips = tipsInRange(tips, currentStart, now);
  const previousTips = tipsInRange(tips, previousStart, currentStart);

  const currentNet = sumNetInRange(tips, currentStart, now);
  const previousNet = sumNetInRange(tips, previousStart, currentStart);

  const currentPlays = countPlaysInRange(
    playEvents,
    scope,
    gameIds,
    currentStart,
    now
  );
  const previousPlays = countPlaysInRange(
    playEvents,
    scope,
    gameIds,
    previousStart,
    currentStart
  );

  const currentConversion =
    currentPlays > 0 ? currentTips.length / currentPlays : 0;
  const previousConversion =
    previousPlays > 0 ? previousTips.length / previousPlays : 0;

  const currentAvg =
    currentTips.length > 0 ? currentNet / currentTips.length : 0;
  const previousAvg =
    previousTips.length > 0 ? previousNet / previousTips.length : 0;

  return [
    {
      key: "revenueTotal",
      value: formatMoney(core.totalAmount),
      change: formatPeriodChange(currentNet, previousNet),
      hintKey: "revenueStatHintLifetime",
      changeLabelKey: "revenueChangeWoW",
    },
    {
      key: "revenueTipsCount",
      value: currentTips.length.toLocaleString("en-US"),
      change: formatPeriodChange(currentTips.length, previousTips.length),
      hintKey: "revenueStatHintLifetimeTips",
      hintParams: { count: core.tipCount },
      changeLabelKey: "revenueChangeWoW",
    },
    {
      key: "revenueAvgTip",
      value: currentAvg > 0 ? formatMoney(currentAvg) : "$0.00",
      change: formatPeriodChange(currentAvg, previousAvg),
      hintKey: "revenueStatHintLast7d",
      changeLabelKey: "revenueChangeWoW",
    },
    {
      key: "revenueConversion",
      value: `${(currentConversion * 100).toFixed(2)}%`,
      change: formatPeriodChange(
        currentConversion * 100,
        previousConversion * 100
      ),
      hintKey: "revenueStatHintConversion",
      changeLabelKey: "revenueChangeWoW",
    },
  ];
}

function buildRecentTips(
  tips: TipRecordRow[],
  gamesById: Map<number, CreatorGameRecord>
): RecentTipRow[] {
  return tips
    .slice()
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .slice(0, 8)
    .map((tip) => ({
      id: tip.id,
      payerName: tip.payer_name?.trim() || null,
      payerId: tip.payer_id,
      payerPlayerNumber: tip.payer_player_number ?? null,
      gameTitle:
        tip.game_title ?? gamesById.get(tip.game_id)?.title ?? `#${tip.game_id}`,
      amount: toNumber(tip.creator_net_usd),
      status: tip.status === "preview" ? "preview" : "live",
      createdAt: tip.created_at,
      publicAnonymous: tip.public_anonymous === true,
    }));
}

function buildCoreForGames(
  scopedGames: CreatorGameRecord[],
  tips: TipRecordRow[],
  trendDays: 7 | 14 | 30
): GameRevenueCore {
  const tipCount = tips.length;
  const totalAmount =
    Math.round(
      tips.reduce((sum, tip) => sum + toNumber(tip.creator_net_usd), 0) * 100
    ) / 100;
  const avgTip = tipCount > 0 ? totalAmount / tipCount : 0;

  return {
    tipCount,
    totalAmount,
    avgTip,
    conversionRate: 0,
    trend: buildTrendPoints(tips, trendDays),
  };
}

function buildBreakdown(
  games: CreatorGameRecord[],
  tips: TipRecordRow[],
  totalAmount: number
): RevenueBreakdownRow[] {
  return games
    .map((game) => {
      const gameTips = tips.filter((tip) => tip.game_id === game.id);
      const gameTotal =
        Math.round(
          gameTips.reduce((sum, tip) => sum + toNumber(tip.creator_net_usd), 0) *
            100
        ) / 100;
      const gameCount = gameTips.length;

      return {
        gameId: game.id,
        title: game.title,
        tipsEnabled: game.tips_enabled,
        tipCount: gameCount,
        totalAmount: gameTotal,
        avgTip: gameCount > 0 ? gameTotal / gameCount : 0,
        sharePercent:
          totalAmount > 0
            ? Math.round((gameTotal / totalAmount) * 1000) / 10
            : 0,
      };
    })
    .sort((a, b) => b.totalAmount - a.totalAmount);
}

export function buildDashboardRevenueFromTips(
  scope: AnalyticsScope,
  games: CreatorGameRecord[],
  tips: TipRecordRow[],
  playEvents: AnalyticsEventRow[] = [],
  trendDays: 7 | 14 | 30 = 14
): DashboardRevenueAnalytics {
  const gamesById = new Map(games.map((game) => [game.id, game]));
  const gameIds = new Set(games.map((game) => game.id));

  const scopedGames =
    scope === ALL_GAMES_SCOPE
      ? games
      : games.filter((game) => game.id === scope);

  const scopedTips = filterTipsByScope(tips, scope, gameIds).filter(
    (tip) => tip.status === "succeeded" || tip.status === "preview"
  );

  const succeededTips = scopedTips.filter((tip) => tip.status === "succeeded");
  const previewTips = scopedTips.filter((tip) => tip.status === "preview");

  const core = buildCoreForGames(scopedGames, scopedTips, trendDays);
  const tipsEnabled = scopedGames.some((game) => game.tips_enabled);

  return {
    stats: buildStats(core, scopedTips, playEvents, scope, gameIds),
    trend: core.trend,
    trendDays,
    breakdown: buildBreakdown(scopedGames, scopedTips, core.totalAmount),
    recentTips: buildRecentTips(scopedTips, gamesById),
    tipsEnabled,
    dataSource: "live",
    succeededTipCount: succeededTips.length,
    previewTipCount: previewTips.length,
  };
}

export function buildEmptyDashboardRevenue(
  games: CreatorGameRecord[],
  scope: AnalyticsScope,
  trendDays: 7 | 14 | 30 = 14
): DashboardRevenueAnalytics {
  const scopedGames =
    scope === ALL_GAMES_SCOPE
      ? games
      : games.filter((game) => game.id === scope);

  const gameIds = new Set(games.map((game) => game.id));

  const emptyCore: GameRevenueCore = {
    tipCount: 0,
    totalAmount: 0,
    avgTip: 0,
    conversionRate: 0,
    trend: buildTrendPoints([], trendDays),
  };

  return {
    stats: buildStats(emptyCore, [], [], scope, gameIds),
    trend: emptyCore.trend,
    trendDays,
    breakdown: buildBreakdown(scopedGames, [], 0),
    recentTips: [],
    tipsEnabled: scopedGames.some((game) => game.tips_enabled),
    dataSource: "live",
    succeededTipCount: 0,
    previewTipCount: 0,
  };
}
