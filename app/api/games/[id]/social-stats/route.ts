import { NextResponse } from "next/server";
import { readCreatorFollowerCount } from "@/lib/creator-follows-service";
import { readGameFavoriteCount } from "@/lib/game-favorites-service";
import { createServerSupabase } from "@/lib/supabase-server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const gameId = Number.parseInt(id, 10);

    if (Number.isNaN(gameId)) {
      return NextResponse.json({ error: "無效的遊戲 ID" }, { status: 400 });
    }

    const supabase = createServerSupabase();
    const { data: game, error } = await supabase
      .from("games")
      .select("creator_id")
      .eq("id", gameId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!game) {
      return NextResponse.json({ error: "找不到此遊戲" }, { status: 404 });
    }

    const favoriteCount = await readGameFavoriteCount(gameId);
    const followerCount = game.creator_id
      ? await readCreatorFollowerCount(game.creator_id)
      : 0;

    return NextResponse.json({ favoriteCount, followerCount });
  } catch (error) {
    const message = error instanceof Error ? error.message : "讀取社交數據失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
