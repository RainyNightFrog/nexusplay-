import type { CreatorGameRecord } from "@/lib/creator-games";

export const ALL_GAMES_SCOPE = "all" as const;
export type AnalyticsScope = typeof ALL_GAMES_SCOPE | number;

export type DashboardTrendPoint = {
  date: string;
  visitors: number;
  plays: number;
};

export type DashboardStatKey =
  | "statPlays"
  | "statVisitors"
  | "statUniquePlayers"
  | "statPageViews";

export type DashboardStat = {
  key: DashboardStatKey;
  value: string;
  change: string;
};

export type DashboardHighlightKey =
  | "highlightPeak"
  | "highlightNewPlayers"
  | "highlightCompletion"
  | "highlightEmbeds";

export type DashboardHighlight = {
  labelKey: DashboardHighlightKey;
  hintKey: `${DashboardHighlightKey}Hint`;
  value: string;
};

export type DashboardAnalytics = {
  stats: DashboardStat[];
  trend: DashboardTrendPoint[];
  highlights: DashboardHighlight[];
};

export const HIGHLIGHT_TIME_RANGES = [
  "week",
  "last7",
  "last14",
  "last30",
] as const;

export type HighlightTimeRange = (typeof HIGHLIGHT_TIME_RANGES)[number];

const RANGE_CONFIG: Record<
  HighlightTimeRange,
  { seedOffset: number; scale: number }
> = {
  week: { seedOffset: 0, scale: 1 },
  last7: { seedOffset: 7, scale: 0.94 },
  last14: { seedOffset: 14, scale: 1.72 },
  last30: { seedOffset: 30, scale: 3.05 },
};

function seededValue(seed: number, min: number, max: number) {
  const normalized = Math.abs(Math.sin(seed * 12.9898) * 43758.5453) % 1;
  return Math.round(min + normalized * (max - min));
}

function formatNumber(value: number) {
  return value.toLocaleString("en-US");
}

function formatPlayTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}m ${remainder.toString().padStart(2, "0")}s`;
}

function formatChange(seed: number) {
  const value = seededValue(seed, 28, 420) / 10;
  return `+${value.toFixed(1)}%`;
}

function buildHighlights(
  seed: number,
  peakPlays: number,
  shares: number,
  timeRange: HighlightTimeRange
): DashboardHighlight[] {
  const { seedOffset, scale } = RANGE_CONFIG[timeRange];
  const rangeSeed = seed + seedOffset;

  const scaledPeak = Math.max(
    1,
    Math.round(peakPlays * scale * (seededValue(rangeSeed + 2, 88, 112) / 100))
  );
  const newPlayers = seededValue(rangeSeed + 41, 34, 82);
  const completion = seededValue(rangeSeed + 53, 22, 62);
  const embeds = Math.max(
    1,
    Math.round(
      Math.max(Math.round(shares * 0.18), seededValue(rangeSeed + 61, 8, 180)) *
        scale
    )
  );

  return [
    {
      labelKey: "highlightPeak",
      hintKey: "highlightPeakHint",
      value: formatNumber(scaledPeak),
    },
    {
      labelKey: "highlightNewPlayers",
      hintKey: "highlightNewPlayersHint",
      value: `${newPlayers}%`,
    },
    {
      labelKey: "highlightCompletion",
      hintKey: "highlightCompletionHint",
      value: `${completion}%`,
    },
    {
      labelKey: "highlightEmbeds",
      hintKey: "highlightEmbedsHint",
      value: formatNumber(embeds),
    },
  ];
}

function buildAllHighlights(timeRange: HighlightTimeRange): DashboardHighlight[] {
  const peak = Math.round(2840 * RANGE_CONFIG[timeRange].scale);
  const embeds = Math.round(412 * RANGE_CONFIG[timeRange].scale);
  const seed = 9001 + RANGE_CONFIG[timeRange].seedOffset;

  return [
    {
      labelKey: "highlightPeak",
      hintKey: "highlightPeakHint",
      value: formatNumber(peak),
    },
    {
      labelKey: "highlightNewPlayers",
      hintKey: "highlightNewPlayersHint",
      value: `${seededValue(seed + 41, 38, 78)}%`,
    },
    {
      labelKey: "highlightCompletion",
      hintKey: "highlightCompletionHint",
      value: `${seededValue(seed + 53, 24, 58)}%`,
    },
    {
      labelKey: "highlightEmbeds",
      hintKey: "highlightEmbedsHint",
      value: formatNumber(embeds),
    },
  ];
}

const ALL_ANALYTICS: DashboardAnalytics = {
  stats: [
    { key: "statPlays", value: "249,120", change: "+22.6%" },
    { key: "statVisitors", value: "21,700", change: "+18.9%" },
    { key: "statUniquePlayers", value: "4,320", change: "+6.8%" },
    { key: "statPageViews", value: "5,180", change: "+31.4%" },
  ],
  trend: [
    { date: "3/21", visitors: 820, plays: 540 },
    { date: "3/22", visitors: 940, plays: 610 },
    { date: "3/23", visitors: 880, plays: 580 },
    { date: "3/24", visitors: 1120, plays: 760 },
    { date: "3/25", visitors: 980, plays: 690 },
    { date: "3/26", visitors: 1340, plays: 910 },
    { date: "3/27", visitors: 1180, plays: 840 },
    { date: "3/28", visitors: 1520, plays: 1020 },
    { date: "3/29", visitors: 1410, plays: 980 },
    { date: "3/30", visitors: 1680, plays: 1140 },
    { date: "3/31", visitors: 1590, plays: 1090 },
    { date: "4/1", visitors: 1820, plays: 1260 },
    { date: "4/2", visitors: 1760, plays: 1210 },
    { date: "4/3", visitors: 1940, plays: 1380 },
  ],
  highlights: buildAllHighlights("week"),
};

function buildTrend(gameId: number, playsBase: number): DashboardTrendPoint[] {
  const dates = [
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

  return dates.map((date, index) => {
    const growth = 0.72 + index * 0.03;
    const variance = seededValue(gameId * 17 + index, 85, 115) / 100;
    const plays = Math.max(
      12,
      Math.round((playsBase / 14) * growth * variance)
    );
    const visitors = Math.round(plays * (1.35 + seededValue(gameId + index, 0, 25) / 100));

    return { date, visitors, plays };
  });
}

function buildGameAnalytics(game: CreatorGameRecord): DashboardAnalytics {
  const seed = game.id;
  const plays = Math.max(game.plays_count, seededValue(seed, 1200, 98000));
  const likes = Math.max(
    Math.round(plays * 0.085),
    seededValue(seed * 3, 80, 9200)
  );
  const playTimeSeconds = seededValue(seed * 5, 145, 420);
  const shares = Math.max(
    Math.round(plays * 0.021),
    seededValue(seed * 7, 20, 1800)
  );
  const trend = buildTrend(seed, plays);
  const peakPlays = Math.max(...trend.map((point) => point.plays));

  return {
    stats: [
      {
        key: "statPlays",
        value: formatNumber(plays),
        change: formatChange(seed),
      },
      {
        key: "statVisitors",
        value: formatNumber(likes),
        change: formatChange(seed + 11),
      },
      {
        key: "statUniquePlayers",
        value: formatNumber(Math.round(plays * 0.04)),
        change: formatChange(seed + 23),
      },
      {
        key: "statPageViews",
        value: formatNumber(shares),
        change: formatChange(seed + 37),
      },
    ],
    trend,
    highlights: buildHighlights(seed, peakPlays, shares, "week"),
  };
}

export function getDashboardHighlights(
  scope: AnalyticsScope,
  games: CreatorGameRecord[],
  timeRange: HighlightTimeRange
): DashboardHighlight[] {
  if (scope === ALL_GAMES_SCOPE) {
    return buildAllHighlights(timeRange);
  }

  const game = games.find((entry) => entry.id === scope);
  if (!game) {
    return buildAllHighlights(timeRange);
  }

  const seed = game.id;
  const plays = Math.max(game.plays_count, seededValue(seed, 1200, 98000));
  const shares = Math.max(
    Math.round(plays * 0.021),
    seededValue(seed * 7, 20, 1800)
  );
  const trend = buildTrend(seed, plays);
  const peakPlays = Math.max(...trend.map((point) => point.plays));

  return buildHighlights(seed, peakPlays, shares, timeRange);
}

export function getDashboardAnalytics(
  scope: AnalyticsScope,
  games: CreatorGameRecord[]
): DashboardAnalytics {
  if (scope === ALL_GAMES_SCOPE) {
    return ALL_ANALYTICS;
  }

  const game = games.find((entry) => entry.id === scope);
  if (!game) {
    return ALL_ANALYTICS;
  }

  return buildGameAnalytics(game);
}