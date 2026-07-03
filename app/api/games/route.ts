import { NextResponse } from "next/server";
import { getGames } from "@/lib/games-service";

export async function GET() {
  try {
    const games = await getGames();
    return NextResponse.json({ games });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "讀取遊戲列表失敗";
    return NextResponse.json({ error: message, games: [] }, { status: 500 });
  }
}
