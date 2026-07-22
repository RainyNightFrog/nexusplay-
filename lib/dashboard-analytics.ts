/**
 * Dashboard Analytics 共用型別與常數。
 * 實際數據由 `dashboard-analytics-server`／`dashboard-analytics-builder` 從 `analytics_events` 組裝。
 */

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
