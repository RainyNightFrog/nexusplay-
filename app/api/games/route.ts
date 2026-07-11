import { NextResponse } from "next/server";
import { parseGameTagsParam } from "@/lib/game-tag-filter";
import { getGames, parseSortOption } from "@/lib/games-service";
import { parseGamePriceFilterFromSearchParams } from "@/lib/game-price-filter";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") ?? undefined;
    const sort = parseSortOption(searchParams.get("sort"));
    const priceFilter = parseGamePriceFilterFromSearchParams(searchParams);
    const tags = parseGameTagsParam(searchParams);

    const games = await getGames({ category, sort, priceFilter, tags });
    return NextResponse.json({
      games,
      category: category ?? "全部",
      sort,
      priceFilter,
      tags,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "讀取遊戲列表失敗";
    return NextResponse.json({ error: message, games: [] }, { status: 500 });
  }
}
