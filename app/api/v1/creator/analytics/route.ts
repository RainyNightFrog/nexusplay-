import { NextResponse } from "next/server";
import {
  authorizeCreatorApiRequest,
  listCreatorGamesForUser,
} from "@/lib/creator-api-auth";
import { getCreatorDashboardAnalytics } from "@/lib/dashboard-analytics-server";
import type { HighlightTimeRange } from "@/lib/dashboard-analytics";
import { ALL_GAMES_SCOPE, HIGHLIGHT_TIME_RANGES } from "@/lib/dashboard-analytics";
import type { AnalyticsScope } from "@/lib/dashboard-analytics";
import type { CreatorGameRecord } from "@/lib/creator-games";

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

export async function GET(request: Request) {
  try {
    const auth = await authorizeCreatorApiRequest(request);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const url = new URL(request.url);
    const games = await listCreatorGamesForUser(auth.userId, {
      ownedOnly: true,
    });

    const scope = parseScope(url.searchParams.get("scope"));
    const highlightRange = parseHighlightRange(url.searchParams.get("range"));

    if (
      scope !== ALL_GAMES_SCOPE &&
      !games.some((game) => game.id === scope)
    ) {
      return NextResponse.json({ error: "找不到此遊戲" }, { status: 404 });
    }

    const payload = await getCreatorDashboardAnalytics({
      scope,
      games: games as CreatorGameRecord[],
      highlightRange,
    });

    return NextResponse.json({
      ...payload,
      meta: { scope, range: highlightRange, auth: auth.via },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "讀取分析資料失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
