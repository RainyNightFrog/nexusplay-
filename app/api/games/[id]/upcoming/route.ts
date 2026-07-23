import { NextResponse } from "next/server";
import { createAuthServerClient } from "@/lib/supabase/server-auth";
import { createServerSupabase } from "@/lib/supabase-server";

function parseGameId(raw: string) {
  const gameId = Number.parseInt(raw, 10);
  return Number.isNaN(gameId) ? null : gameId;
}

/** PATCH：創作者切換「即將推出」狀態 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const gameId = parseGameId(id);
    if (!gameId) {
      return NextResponse.json({ error: "無效的遊戲 ID" }, { status: 400 });
    }

    const authClient = await createAuthServerClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "請先登入" }, { status: 401 });
    }

    const body = (await request.json()) as { isUpcoming?: boolean };
    if (typeof body.isUpcoming !== "boolean") {
      return NextResponse.json(
        { error: "請提供 isUpcoming 布林值" },
        { status: 400 }
      );
    }

    const supabase = createServerSupabase();
    const { data: game, error: readError } = await supabase
      .from("games")
      .select("id, creator_id, is_upcoming")
      .eq("id", gameId)
      .maybeSingle();

    if (readError) throw new Error(readError.message);
    if (!game) {
      return NextResponse.json({ error: "找不到此遊戲" }, { status: 404 });
    }
    if (game.creator_id !== user.id) {
      return NextResponse.json(
        { error: "只有遊戲創作者可以設定即將推出" },
        { status: 403 }
      );
    }

    const { data, error } = await supabase
      .from("games")
      .update({ is_upcoming: body.isUpcoming })
      .eq("id", gameId)
      .select("id, is_upcoming")
      .single();

    if (error) throw new Error(error.message);

    return NextResponse.json({
      gameId: data.id,
      isUpcoming: data.is_upcoming === true,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "更新即將推出狀態失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
