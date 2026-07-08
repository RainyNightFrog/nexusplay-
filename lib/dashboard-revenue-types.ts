import type { CreatorGameRecord } from "@/lib/creator-games";
import type { AnalyticsScope } from "@/lib/dashboard-analytics";
import { ALL_GAMES_SCOPE } from "@/lib/dashboard-analytics";

export type RevenueStatKey =
  | "revenueTotal"
  | "revenueTipsCount"
  | "revenueAvgTip"
  | "revenueConversion";

export type RevenueStat = {
  key: RevenueStatKey;
  value: string;
  change: string;
  hintKey?: string;
  hintParams?: Record<string, string | number>;
  changeLabelKey?: string;
};

export type RevenueTrendPoint = {
  date: string;
  tips: number;
  amount: number;
};

export type RevenueBreakdownRow = {
  gameId: number;
  title: string;
  tipsEnabled: boolean;
  tipCount: number;
  totalAmount: number;
  avgTip: number;
  sharePercent: number;
};

export type RecentTipRow = {
  id: string;
  playerLabel: string;
  gameTitle: string;
  amount: number;
  status?: "preview" | "live";
  relativeTimeKey: "revenueTimeJustNow" | "revenueTimeHours" | "revenueTimeDays";
  relativeTimeValue?: number;
};

export type DashboardRevenueAnalytics = {
  stats: RevenueStat[];
  trend: RevenueTrendPoint[];
  trendDays: 7 | 14 | 30;
  breakdown: RevenueBreakdownRow[];
  recentTips: RecentTipRow[];
  tipsEnabled: boolean;
  dataSource: "live";
  succeededTipCount: number;
  previewTipCount: number;
};

export type GameRevenueCore = {
  tipCount: number;
  totalAmount: number;
  avgTip: number;
  conversionRate: number;
  trend: RevenueTrendPoint[];
};

export function formatRevenueMoney(value: number) {
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** @deprecated 請改用 API `/api/dashboard/revenue` 讀取真實 game_tips 資料 */
export function getDashboardRevenue(
  scope: AnalyticsScope,
  games: CreatorGameRecord[]
): DashboardRevenueAnalytics {
  const scopedGames =
    scope === ALL_GAMES_SCOPE
      ? games
      : games.filter((game) => game.id === scope);

  const emptyTrend = Array.from({ length: 14 }, (_, index) => {
    const day = new Date();
    day.setDate(day.getDate() - (13 - index));
    return {
      date: `${day.getMonth() + 1}/${day.getDate()}`,
      tips: 0,
      amount: 0,
    };
  });

  return {
    stats: [
      {
        key: "revenueTotal",
        value: "$0.00",
        change: "—",
        hintKey: "revenueStatHintLifetime",
      },
      {
        key: "revenueTipsCount",
        value: "0",
        change: "—",
        hintKey: "revenueStatHintLast7d",
        hintParams: { count: 0 },
      },
      {
        key: "revenueAvgTip",
        value: "$0.00",
        change: "—",
        hintKey: "revenueStatHintLast7d",
      },
      {
        key: "revenueConversion",
        value: "0.0%",
        change: "—",
        hintKey: "revenueStatHintConversion",
      },
    ],
    trend: emptyTrend,
    trendDays: 14,
    breakdown: scopedGames.map((game) => ({
      gameId: game.id,
      title: game.title,
      tipsEnabled: game.tips_enabled,
      tipCount: 0,
      totalAmount: 0,
      avgTip: 0,
      sharePercent: 0,
    })),
    recentTips: [],
    tipsEnabled: scopedGames.some((game) => game.tips_enabled),
    dataSource: "live",
    succeededTipCount: 0,
    previewTipCount: 0,
  };
}
