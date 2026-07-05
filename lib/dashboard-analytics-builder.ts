import type { CreatorGameRecord } from "@/lib/creator-games";
import type {
  AnalyticsScope,
  DashboardAnalytics,
  DashboardHighlight,
  DashboardStat,
  DashboardTrendPoint,
  HighlightTimeRange,
} from "@/lib/dashboard-analytics";
import { ALL_GAMES_SCOPE } from "@/lib/dashboard-analytics";

export type AnalyticsEventRow = {
  event_type: "page_view" | "game_play";
  game_id: number | null;
  session_id: string;
  created_at: string;
};

function rangeToDays(range: HighlightTimeRange) {
  if (range === "last14") return 14;
  if (range === "last30") return 30;
  return 7;
}

function formatNumber(value: number) {
  return value.toLocaleString("en-US");
}

function formatChange(current: number, previous: number) {
  if (current === 0 && previous === 0) return "—";
  if (previous === 0) return "+100%";
  const change = ((current - previous) / previous) * 100;
  return `${change >= 0 ? "+" : ""}${change.toFixed(1)}%`;
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

function eventsInRange(
  events: AnalyticsEventRow[],
  start: Date,
  end: Date
) {
  return events.filter((event) => {
    const created = new Date(event.created_at);
    return created >= start && created <= end;
  });
}

function countPlays(events: AnalyticsEventRow[]) {
  return events.filter((event) => event.event_type === "game_play").length;
}

function countPageViews(events: AnalyticsEventRow[]) {
  return events.filter((event) => event.event_type === "page_view").length;
}

function uniqueSessions(events: AnalyticsEventRow[], type?: "page_view" | "game_play") {
  const sessions = new Set<string>();
  for (const event of events) {
    if (type && event.event_type !== type) continue;
    sessions.add(event.session_id);
  }
  return sessions.size;
}

function buildTrend(events: AnalyticsEventRow[]): DashboardTrendPoint[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const points: DashboardTrendPoint[] = [];

  for (let offset = 13; offset >= 0; offset -= 1) {
    const day = new Date(today);
    day.setDate(today.getDate() - offset);
    const nextDay = new Date(day);
    nextDay.setDate(day.getDate() + 1);

    const dayEvents = events.filter((event) => {
      const created = new Date(event.created_at);
      return created >= day && created < nextDay;
    });

    points.push({
      date: `${day.getMonth() + 1}/${day.getDate()}`,
      visitors: countPageViews(dayEvents),
      plays: countPlays(dayEvents),
    });
  }

  return points;
}

function buildStats(
  currentEvents: AnalyticsEventRow[],
  previousEvents: AnalyticsEventRow[],
  cumulativePlays: number
): DashboardStat[] {
  const currentPlays = countPlays(currentEvents);
  const previousPlays = countPlays(previousEvents);
  const currentViews = countPageViews(currentEvents);
  const previousViews = countPageViews(previousEvents);
  const currentPlayers = uniqueSessions(currentEvents, "game_play");
  const previousPlayers = uniqueSessions(previousEvents, "game_play");
  const currentVisitors = uniqueSessions(currentEvents, "page_view");
  const previousVisitors = uniqueSessions(previousEvents, "page_view");

  return [
    {
      key: "statPlays",
      value: formatNumber(currentPlays > 0 ? currentPlays : cumulativePlays),
      change: formatChange(currentPlays, previousPlays),
    },
    {
      key: "statVisitors",
      value: formatNumber(currentVisitors),
      change: formatChange(currentVisitors, previousVisitors),
    },
    {
      key: "statUniquePlayers",
      value: formatNumber(currentPlayers),
      change: formatChange(currentPlayers, previousPlayers),
    },
    {
      key: "statPageViews",
      value: formatNumber(currentViews),
      change: formatChange(currentViews, previousViews),
    },
  ];
}

function buildHighlights(
  events: AnalyticsEventRow[],
  range: HighlightTimeRange
): DashboardHighlight[] {
  const days = rangeToDays(range);
  const end = new Date();
  const start = new Date(end);
  start.setDate(end.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);

  const rangeEvents = eventsInRange(events, start, end);
  const trend = buildTrend(rangeEvents);
  const peakPlays = trend.reduce((max, point) => Math.max(max, point.plays), 0);
  const pageViews = countPageViews(rangeEvents);
  const uniquePlayers = uniqueSessions(rangeEvents, "game_play");
  const plays = countPlays(rangeEvents);
  const conversion =
    pageViews > 0 ? Math.round((plays / pageViews) * 1000) / 10 : 0;

  return [
    {
      labelKey: "highlightPeak",
      hintKey: "highlightPeakHint",
      value: formatNumber(peakPlays),
    },
    {
      labelKey: "highlightNewPlayers",
      hintKey: "highlightNewPlayersHint",
      value: `${conversion}%`,
    },
    {
      labelKey: "highlightCompletion",
      hintKey: "highlightCompletionHint",
      value: formatNumber(uniquePlayers),
    },
    {
      labelKey: "highlightEmbeds",
      hintKey: "highlightEmbedsHint",
      value: formatNumber(pageViews),
    },
  ];
}

function emptyAnalytics(games: CreatorGameRecord[]): DashboardAnalytics {
  return {
    stats: buildStats([], [], games.reduce((sum, game) => sum + game.plays_count, 0)),
    trend: buildTrend([]),
    highlights: buildHighlights([], "week"),
  };
}

export function buildDashboardAnalyticsFromEvents(params: {
  scope: AnalyticsScope;
  games: CreatorGameRecord[];
  events: AnalyticsEventRow[];
  highlightRange: HighlightTimeRange;
}): { analytics: DashboardAnalytics; highlights: DashboardHighlight[] } {
  const gameIds = new Set(params.games.map((game) => game.id));
  const scopedGames =
    params.scope === ALL_GAMES_SCOPE
      ? params.games
      : params.games.filter((game) => game.id === params.scope);

  if (scopedGames.length === 0) {
    const empty = emptyAnalytics(params.games);
    return { analytics: empty, highlights: empty.highlights };
  }

  const scopedEvents = filterEventsByScope(
    params.events,
    params.scope,
    gameIds
  );

  const cumulativePlays = scopedGames.reduce(
    (sum, game) => sum + Math.max(game.plays_count, 0),
    0
  );

  const now = new Date();
  const currentStart = new Date(now);
  currentStart.setDate(now.getDate() - 6);
  currentStart.setHours(0, 0, 0, 0);
  const previousStart = new Date(currentStart);
  previousStart.setDate(currentStart.getDate() - 7);

  const currentEvents = eventsInRange(scopedEvents, currentStart, now);
  const previousEvents = eventsInRange(
    scopedEvents,
    previousStart,
    new Date(currentStart.getTime() - 1)
  );

  const trend = buildTrend(scopedEvents);
  const stats = buildStats(currentEvents, previousEvents, cumulativePlays);
  const highlights = buildHighlights(scopedEvents, params.highlightRange);

  return {
    analytics: { stats, trend, highlights },
    highlights,
  };
}
