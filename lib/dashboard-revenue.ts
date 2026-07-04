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
  relativeTimeKey: "revenueTimeJustNow" | "revenueTimeHours" | "revenueTimeDays";
  relativeTimeValue?: number;
};

export type DashboardRevenueAnalytics = {
  stats: RevenueStat[];
  trend: RevenueTrendPoint[];
  breakdown: RevenueBreakdownRow[];
  recentTips: RecentTipRow[];
  tipsEnabled: boolean;
};

type GameRevenueCore = {
  tipCount: number;
  totalAmount: number;
  avgTip: number;
  conversionRate: number;
  trend: RevenueTrendPoint[];
};

const TREND_DATES = [
  "3/21",
  "3/22",
  "3/23",
  "3/24",
  "3/25",
  "3/26",
  "3/27",
  "3/28",
  "3/29",
  "3/30",
  "3/31",
  "4/1",
  "4/2",
  "4/3",
];

const MOCK_PLAYER_LABELS = [
  "NeonRunner",
  "PixelFan_88",
  "VoidWalker",
  "StarGazer",
  "CyberKitty",
  "ArcadeHero",
  "LuckyPlayer",
  "MoonLite",
];

function seededValue(seed: number, min: number, max: number) {
  const normalized = Math.abs(Math.sin(seed * 12.9898) * 43758.5453) % 1;
  return min + normalized * (max - min);
}

function formatMoney(value: number) {
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatChange(seed: number) {
  const value = seededValue(seed, 12, 380) / 10;
  return `+${value.toFixed(1)}%`;
}

function buildGameRevenueCore(game: CreatorGameRecord): GameRevenueCore {
  const seed = game.id;

  if (!game.tips_enabled) {
    return {
      tipCount: 0,
      totalAmount: 0,
      avgTip: 0,
      conversionRate: 0,
      trend: TREND_DATES.map((date) => ({ date, tips: 0, amount: 0 })),
    };
  }

  const suggested = game.suggested_tip_amount ?? 5;
  const plays = Math.max(game.plays_count, seededValue(seed, 800, 48000));
  const conversionRate =
    seededValue(seed + 13, 22, 92) / 1000;
  const tipCount = Math.max(
    Math.round(plays * conversionRate),
    seededValue(seed + 7, 8, 180)
  );
  const avgTip = suggested * (0.82 + seededValue(seed + 19, 0, 48) / 100);
  const totalAmount = Math.round(tipCount * avgTip * 100) / 100;

  const trend = TREND_DATES.map((date, index) => {
    const variance = seededValue(seed * 23 + index, 70, 130) / 100;
    const dailyTips = Math.max(
      0,
      Math.round((tipCount / 14) * (0.75 + index * 0.025) * variance)
    );
    const dailyAmount = Math.round(dailyTips * avgTip * 100) / 100;
    return { date, tips: dailyTips, amount: dailyAmount };
  });

  return {
    tipCount,
    totalAmount,
    avgTip,
    conversionRate,
    trend,
  };
}

function buildStats(core: GameRevenueCore, seed: number): RevenueStat[] {
  return [
    {
      key: "revenueTotal",
      value: formatMoney(core.totalAmount),
      change: formatChange(seed),
    },
    {
      key: "revenueTipsCount",
      value: core.tipCount.toLocaleString("en-US"),
      change: formatChange(seed + 3),
    },
    {
      key: "revenueAvgTip",
      value: core.avgTip > 0 ? formatMoney(core.avgTip) : "$0.00",
      change: formatChange(seed + 5),
    },
    {
      key: "revenueConversion",
      value: `${(core.conversionRate * 100).toFixed(1)}%`,
      change: formatChange(seed + 9),
    },
  ];
}

function buildRecentTips(
  games: CreatorGameRecord[],
  scope: AnalyticsScope,
  cores: Map<number, GameRevenueCore>
): RecentTipRow[] {
  const sourceGames =
    scope === ALL_GAMES_SCOPE
      ? games.filter((g) => g.tips_enabled && (cores.get(g.id)?.tipCount ?? 0) > 0)
      : games.filter((g) => g.id === scope && g.tips_enabled);

  const rows: RecentTipRow[] = [];

  sourceGames.forEach((game, gameIndex) => {
    const core = cores.get(game.id);
    if (!core || core.tipCount === 0) return;

    const count = Math.min(3, Math.max(1, Math.round(core.tipCount / 40)));
    for (let i = 0; i < count; i += 1) {
      const seed = game.id * 100 + i + gameIndex;
      const playerLabel =
        MOCK_PLAYER_LABELS[Math.floor(seededValue(seed, 0, MOCK_PLAYER_LABELS.length))];
      const amount =
        Math.round(
          core.avgTip * (0.5 + seededValue(seed + 1, 0, 250) / 100) * 100
        ) / 100;
      const timeRoll = seededValue(seed + 2, 0, 100);

      if (timeRoll < 20) {
        rows.push({
          id: `${game.id}-${i}`,
          playerLabel,
          gameTitle: game.title,
          amount,
          relativeTimeKey: "revenueTimeJustNow",
        });
      } else if (timeRoll < 65) {
        rows.push({
          id: `${game.id}-${i}`,
          playerLabel,
          gameTitle: game.title,
          amount,
          relativeTimeKey: "revenueTimeHours",
          relativeTimeValue: Math.max(1, Math.round(seededValue(seed + 3, 1, 22))),
        });
      } else {
        rows.push({
          id: `${game.id}-${i}`,
          playerLabel,
          gameTitle: game.title,
          amount,
          relativeTimeKey: "revenueTimeDays",
          relativeTimeValue: Math.max(1, Math.round(seededValue(seed + 4, 1, 12))),
        });
      }
    }
  });

  return rows
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 8);
}

function mergeTrends(trends: RevenueTrendPoint[][]): RevenueTrendPoint[] {
  return TREND_DATES.map((date, index) => {
    let tips = 0;
    let amount = 0;
    for (const trend of trends) {
      tips += trend[index]?.tips ?? 0;
      amount += trend[index]?.amount ?? 0;
    }
    return {
      date,
      tips,
      amount: Math.round(amount * 100) / 100,
    };
  });
}

function buildAllRevenue(games: CreatorGameRecord[]): DashboardRevenueAnalytics {
  const cores = new Map<number, GameRevenueCore>();
  games.forEach((game) => {
    cores.set(game.id, buildGameRevenueCore(game));
  });

  const enabledGames = games.filter((g) => g.tips_enabled);
  const aggregate = enabledGames.reduce(
    (acc, game) => {
      const core = cores.get(game.id)!;
      acc.tipCount += core.tipCount;
      acc.totalAmount += core.totalAmount;
      acc.conversionRate += core.conversionRate;
      acc.trends.push(core.trend);
      return acc;
    },
    {
      tipCount: 0,
      totalAmount: 0,
      conversionRate: 0,
      trends: [] as RevenueTrendPoint[][],
    }
  );

  const avgTip =
    aggregate.tipCount > 0 ? aggregate.totalAmount / aggregate.tipCount : 0;
  const avgConversion =
    enabledGames.length > 0
      ? aggregate.conversionRate / enabledGames.length
      : 0;

  const core: GameRevenueCore = {
    tipCount: aggregate.tipCount,
    totalAmount: Math.round(aggregate.totalAmount * 100) / 100,
    avgTip,
    conversionRate: avgConversion,
    trend: mergeTrends(aggregate.trends),
  };

  const breakdown = games
    .map((game) => {
      const rowCore = cores.get(game.id)!;
      return {
        gameId: game.id,
        title: game.title,
        tipsEnabled: game.tips_enabled,
        tipCount: rowCore.tipCount,
        totalAmount: rowCore.totalAmount,
        avgTip: rowCore.avgTip,
        sharePercent:
          core.totalAmount > 0
            ? Math.round((rowCore.totalAmount / core.totalAmount) * 1000) / 10
            : 0,
      };
    })
    .sort((a, b) => b.totalAmount - a.totalAmount);

  return {
    stats: buildStats(core, 9001),
    trend: core.trend,
    breakdown,
    recentTips: buildRecentTips(games, ALL_GAMES_SCOPE, cores),
    tipsEnabled: enabledGames.length > 0,
  };
}

function buildSingleRevenue(game: CreatorGameRecord): DashboardRevenueAnalytics {
  const core = buildGameRevenueCore(game);

  return {
    stats: buildStats(core, game.id),
    trend: core.trend,
    breakdown: [
      {
        gameId: game.id,
        title: game.title,
        tipsEnabled: game.tips_enabled,
        tipCount: core.tipCount,
        totalAmount: core.totalAmount,
        avgTip: core.avgTip,
        sharePercent: core.totalAmount > 0 ? 100 : 0,
      },
    ],
    recentTips: buildRecentTips(
      [game],
      game.id,
      new Map([[game.id, core]])
    ),
    tipsEnabled: game.tips_enabled,
  };
}

export function getDashboardRevenue(
  scope: AnalyticsScope,
  games: CreatorGameRecord[]
): DashboardRevenueAnalytics {
  if (scope === ALL_GAMES_SCOPE) {
    return buildAllRevenue(games);
  }

  const game = games.find((entry) => entry.id === scope);
  if (!game) {
    return buildAllRevenue(games);
  }

  return buildSingleRevenue(game);
}

export function formatRevenueMoney(value: number) {
  return formatMoney(value);
}
