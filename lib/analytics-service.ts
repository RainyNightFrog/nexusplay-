import { createServerSupabase } from "@/lib/supabase-server";

export const ANALYTICS_SESSION_COOKIE = "np_sid";
export const ANALYTICS_TIMEZONE = "Asia/Hong_Kong";

export type AnalyticsEventType = "page_view" | "game_play";
export type AnalyticsRange = "today" | "week" | "month";

export type TrackAnalyticsInput = {
  eventType: AnalyticsEventType;
  sessionId: string;
  path?: string | null;
  gameId?: number | null;
  userId?: string | null;
  locale?: string | null;
};

export type GamePlayStat = {
  gameId: number;
  title: string;
  coverUrl: string;
  plays: number;
  uniquePlayers: number;
};

export type TrendPoint = {
  label: string;
  pageViews: number;
  gamePlays: number;
};

export type AdminAnalyticsData = {
  range: AnalyticsRange;
  periodStart: string;
  periodEnd: string;
  pageViews: number;
  uniqueVisitors: number;
  gamePlays: number;
  uniquePlayers: number;
  gamesPlayed: GamePlayStat[];
  trend: TrendPoint[];
};

type AnalyticsEventRow = {
  event_type: AnalyticsEventType;
  path: string | null;
  game_id: number | null;
  session_id: string;
  created_at: string;
};

function getHktDateParts(date: Date) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: ANALYTICS_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number.parseInt(parts.find((part) => part.type === type)?.value ?? "0", 10);

  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
    hour: read("hour"),
  };
}

function hktMidnightUtc(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day, -8, 0, 0, 0));
}

export function getAnalyticsRangeBounds(range: AnalyticsRange, now = new Date()) {
  const { year, month, day } = getHktDateParts(now);
  const end = now;

  if (range === "today") {
    return {
      start: hktMidnightUtc(year, month, day),
      end,
    };
  }

  if (range === "week") {
    const start = new Date(end);
    start.setUTCDate(start.getUTCDate() - 6);
    return { start, end };
  }

  return {
    start: hktMidnightUtc(year, month, 1),
    end,
  };
}

export async function trackAnalyticsEvent(input: TrackAnalyticsInput): Promise<void> {
  const supabase = createServerSupabase();

  const { error } = await supabase.from("analytics_events").insert({
    event_type: input.eventType,
    path: input.path?.trim() || null,
    game_id: input.gameId ?? null,
    user_id: input.userId ?? null,
    session_id: input.sessionId,
    locale: input.locale ?? null,
  });

  if (error) {
    throw new Error(`寫入人流統計失敗：${error.message}`);
  }
}

function buildTrend(
  events: AnalyticsEventRow[],
  range: AnalyticsRange,
  start: Date,
  end: Date
): TrendPoint[] {
  const buckets = new Map<string, { pageViews: number; gamePlays: number }>();

  if (range === "today") {
    const { year, month, day } = getHktDateParts(start);
    for (let hour = 0; hour < 24; hour += 1) {
      const key = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")} ${String(hour).padStart(2, "0")}:00`;
      buckets.set(key, { pageViews: 0, gamePlays: 0 });
    }
  } else {
    const cursor = new Date(start);
    while (cursor <= end) {
      const { year, month, day } = getHktDateParts(cursor);
      const key = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      buckets.set(key, { pageViews: 0, gamePlays: 0 });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
  }

  for (const event of events) {
    const createdAt = new Date(event.created_at);
    const { year, month, day, hour } = getHktDateParts(createdAt);
    const key =
      range === "today"
        ? `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")} ${String(hour).padStart(2, "0")}:00`
        : `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    const bucket = buckets.get(key);
    if (!bucket) continue;

    if (event.event_type === "page_view") {
      bucket.pageViews += 1;
    } else {
      bucket.gamePlays += 1;
    }
  }

  return [...buckets.entries()].map(([label, counts]) => ({
    label,
    pageViews: counts.pageViews,
    gamePlays: counts.gamePlays,
  }));
}

export async function getAdminAnalytics(
  range: AnalyticsRange
): Promise<AdminAnalyticsData> {
  const supabase = createServerSupabase();
  const { start, end } = getAnalyticsRangeBounds(range);

  const { data, error } = await supabase
    .from("analytics_events")
    .select("event_type, path, game_id, session_id, created_at")
    .gte("created_at", start.toISOString())
    .lte("created_at", end.toISOString());

  if (error) {
    throw new Error(`讀取人流統計失敗：${error.message}`);
  }

  const events = (data ?? []) as AnalyticsEventRow[];
  const pageViewSessions = new Set<string>();
  const gamePlaySessions = new Set<string>();
  const gameStats = new Map<
    number,
    { plays: number; sessions: Set<string> }
  >();

  let pageViews = 0;
  let gamePlays = 0;

  for (const event of events) {
    if (event.event_type === "page_view") {
      pageViews += 1;
      pageViewSessions.add(event.session_id);
      continue;
    }

    gamePlays += 1;
    gamePlaySessions.add(event.session_id);

    if (!event.game_id) continue;

    const current = gameStats.get(event.game_id) ?? {
      plays: 0,
      sessions: new Set<string>(),
    };
    current.plays += 1;
    current.sessions.add(event.session_id);
    gameStats.set(event.game_id, current);
  }

  const gameIds = [...gameStats.keys()];
  const gameMeta = new Map<number, { title: string; coverUrl: string }>();

  if (gameIds.length > 0) {
    const { data: games, error: gamesError } = await supabase
      .from("games")
      .select("id, title, cover_url")
      .in("id", gameIds);

    if (gamesError) {
      throw new Error(`讀取遊戲資料失敗：${gamesError.message}`);
    }

    for (const game of games ?? []) {
      gameMeta.set(game.id as number, {
        title: game.title as string,
        coverUrl: game.cover_url as string,
      });
    }
  }

  const gamesPlayed = gameIds
    .map((gameId) => {
      const stats = gameStats.get(gameId)!;
      const meta = gameMeta.get(gameId);
      return {
        gameId,
        title: meta?.title ?? `Game #${gameId}`,
        coverUrl: meta?.coverUrl ?? "/placeholder-game.png",
        plays: stats.plays,
        uniquePlayers: stats.sessions.size,
      };
    })
    .sort((a, b) => b.plays - a.plays);

  return {
    range,
    periodStart: start.toISOString(),
    periodEnd: end.toISOString(),
    pageViews,
    uniqueVisitors: pageViewSessions.size,
    gamePlays,
    uniquePlayers: gamePlaySessions.size,
    gamesPlayed,
    trend: buildTrend(events, range, start, end),
  };
}
