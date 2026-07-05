import { NextResponse } from "next/server";
import { readGameFavoriteCounts } from "@/lib/game-favorites-service";

function parseGameIds(raw: string | null) {
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map((value) => Number.parseInt(value.trim(), 10))
    .filter((value) => !Number.isNaN(value));
}

export async function GET(request: Request) {
  try {
    const ids = parseGameIds(new URL(request.url).searchParams.get("ids"));

    if (ids.length === 0) {
      return NextResponse.json({ favoriteCounts: {} });
    }

    const favoriteCounts = await readGameFavoriteCounts(ids.slice(0, 100));
    return NextResponse.json({ favoriteCounts });
  } catch (error) {
    const message = error instanceof Error ? error.message : "讀取收藏數失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
