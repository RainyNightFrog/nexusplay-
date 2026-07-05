import type { CreatorGameRecord } from "@/lib/creator-games";
import type { AnalyticsScope } from "@/lib/dashboard-analytics";
import { ALL_GAMES_SCOPE } from "@/lib/dashboard-analytics";
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

function buildTrendPoints(tips: TipRecordRow[]): RevenueTrendPoint[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const buckets: RevenueTrendPoint[] = [];

  for (let offset = 13; offset >= 0; offset -= 1) {
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

function anonymizePayer(name: string | null | undefined, payerId: string) {
  if (name?.trim()) {
    const trimmed = name.trim();
    if (trimmed.length <= 2) return trimmed;
    return `${trimmed.slice(0, 2)}***`;
  }
  return `Player ${payerId.slice(0, 4)}`;
}

function relativeTimeFromDate(iso: string): Pick<
  RecentTipRow,
  "relativeTimeKey" | "relativeTimeValue"
> {
  const created = new Date(iso).getTime();
  const diffMs = Date.now() - created;
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours < 1) {
    return { relativeTimeKey: "revenueTimeJustNow" };
  }
  if (diffHours < 24) {
    return {
      relativeTimeKey: "revenueTimeHours",
      relativeTimeValue: Math.max(1, Math.round(diffHours)),
    };
  }

  return {
    relativeTimeKey: "revenueTimeDays",
    relativeTimeValue: Math.max(1, Math.round(diffHours / 24)),
  };
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

function buildStats(core: GameRevenueCore, tips: TipRecordRow[]): RevenueStat[] {
  const now = new Date();
  const currentStart = new Date(now);
  currentStart.setDate(now.getDate() - 7);
  const previousStart = new Date(now);
  previousStart.setDate(now.getDate() - 14);

  const currentNet = sumNetInRange(tips, currentStart, now);
  const previousNet = sumNetInRange(tips, previousStart, currentStart);

  const currentCount = tips.filter((tip) => {
    const created = new Date(tip.created_at);
    return created >= currentStart && created <= now;
  }).length;
  const previousCount = tips.filter((tip) => {
    const created = new Date(tip.created_at);
    return created >= previousStart && created < currentStart;
  }).length;

  return [
    {
      key: "revenueTotal",
      value: formatMoney(core.totalAmount),
      change: formatPeriodChange(currentNet, previousNet),
    },
    {
      key: "revenueTipsCount",
      value: core.tipCount.toLocaleString("en-US"),
      change: formatPeriodChange(currentCount, previousCount),
    },
    {
      key: "revenueAvgTip",
      value: core.avgTip > 0 ? formatMoney(core.avgTip) : "$0.00",
      change: formatPeriodChange(
        currentCount > 0 ? currentNet / currentCount : 0,
        previousCount > 0 ? previousNet / previousCount : 0
      ),
    },
    {
      key: "revenueConversion",
      value: `${(core.conversionRate * 100).toFixed(1)}%`,
      change: "—",
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
      playerLabel: anonymizePayer(tip.payer_name, tip.payer_id),
      gameTitle:
        tip.game_title ?? gamesById.get(tip.game_id)?.title ?? `#${tip.game_id}`,
      amount: toNumber(tip.creator_net_usd),
      status: tip.status === "preview" ? "preview" : "live",
      ...relativeTimeFromDate(tip.created_at),
    }));
}

function buildCoreForGames(
  scopedGames: CreatorGameRecord[],
  tips: TipRecordRow[]
): GameRevenueCore {
  const tipCount = tips.length;
  const totalAmount =
    Math.round(
      tips.reduce((sum, tip) => sum + toNumber(tip.creator_net_usd), 0) * 100
    ) / 100;
  const avgTip = tipCount > 0 ? totalAmount / tipCount : 0;
  const totalPlays = scopedGames.reduce(
    (sum, game) => sum + Math.max(game.plays_count, 0),
    0
  );
  const conversionRate = totalPlays > 0 ? tipCount / totalPlays : 0;

  return {
    tipCount,
    totalAmount,
    avgTip,
    conversionRate,
    trend: buildTrendPoints(tips),
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
  tips: TipRecordRow[]
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

  const core = buildCoreForGames(scopedGames, scopedTips);
  const tipsEnabled = scopedGames.some((game) => game.tips_enabled);

  return {
    stats: buildStats(core, scopedTips),
    trend: core.trend,
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
  scope: AnalyticsScope
): DashboardRevenueAnalytics {
  const scopedGames =
    scope === ALL_GAMES_SCOPE
      ? games
      : games.filter((game) => game.id === scope);

  const emptyCore: GameRevenueCore = {
    tipCount: 0,
    totalAmount: 0,
    avgTip: 0,
    conversionRate: 0,
    trend: buildTrendPoints([]),
  };

  return {
    stats: buildStats(emptyCore, []),
    trend: emptyCore.trend,
    breakdown: buildBreakdown(scopedGames, [], 0),
    recentTips: [],
    tipsEnabled: scopedGames.some((game) => game.tips_enabled),
    dataSource: "live",
    succeededTipCount: 0,
    previewTipCount: 0,
  };
}
