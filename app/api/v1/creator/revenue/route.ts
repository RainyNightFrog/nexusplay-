import { NextResponse } from "next/server";
import {
  authorizeCreatorApiRequest,
  listCreatorGamesForUser,
} from "@/lib/creator-api-auth";
import { getCreatorDashboardRevenue } from "@/lib/dashboard-revenue-server";
import { ALL_GAMES_SCOPE } from "@/lib/dashboard-analytics";
import type { AnalyticsScope } from "@/lib/dashboard-analytics";
import type { CreatorGameRecord } from "@/lib/creator-games";

function parseScope(value: string | null): AnalyticsScope {
  if (!value || value === "all") return ALL_GAMES_SCOPE;
  const numeric = Number.parseInt(value, 10);
  return Number.isNaN(numeric) ? ALL_GAMES_SCOPE : numeric;
}

export async function GET(request: Request) {
  try {
    const auth = await authorizeCreatorApiRequest(request);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const scope = parseScope(new URL(request.url).searchParams.get("scope"));
    const games = await listCreatorGamesForUser(auth.userId, {
      ownedOnly: true,
    });

    if (
      scope !== ALL_GAMES_SCOPE &&
      !games.some((game) => game.id === scope)
    ) {
      return NextResponse.json({ error: "找不到此遊戲" }, { status: 404 });
    }

    const revenue = await getCreatorDashboardRevenue({
      userId: auth.userId,
      scope,
      games: games as CreatorGameRecord[],
    });

    return NextResponse.json({
      revenue,
      meta: { scope, auth: auth.via },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "讀取收益資料失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
