import { NextResponse } from "next/server";
import {
  addGameFavorite,
  isGameFavorited,
  listFavoriteGames,
  removeGameFavorite,
} from "@/lib/game-favorites-service";
import { createAuthServerClient } from "@/lib/supabase/server-auth";

function parseGameId(raw: string | null) {
  if (!raw) return null;
  const value = Number.parseInt(raw, 10);
  return Number.isNaN(value) ? null : value;
}

export async function GET(request: Request) {
  try {
    const authClient = await createAuthServerClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "請先登入" }, { status: 401 });
    }

    const gameId = parseGameId(
      new URL(request.url).searchParams.get("gameId")
    );

    if (gameId != null) {
      const favorited = await isGameFavorited(authClient, user.id, gameId);
      return NextResponse.json({ favorited });
    }

    const games = await listFavoriteGames(user.id);
    return NextResponse.json({ games });
  } catch (error) {
    const message = error instanceof Error ? error.message : "讀取收藏失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authClient = await createAuthServerClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "請先登入" }, { status: 401 });
    }

    const body = (await request.json()) as { gameId?: number };
    const gameId = parseGameId(body.gameId != null ? String(body.gameId) : null);

    if (gameId == null) {
      return NextResponse.json({ error: "無效的遊戲 ID" }, { status: 400 });
    }

    await addGameFavorite(authClient, user.id, gameId);
    return NextResponse.json({ favorited: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "加入收藏失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const authClient = await createAuthServerClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "請先登入" }, { status: 401 });
    }

    const gameId = parseGameId(
      new URL(request.url).searchParams.get("gameId")
    );

    if (gameId == null) {
      return NextResponse.json({ error: "無效的遊戲 ID" }, { status: 400 });
    }

    await removeGameFavorite(authClient, user.id, gameId);
    return NextResponse.json({ favorited: false });
  } catch (error) {
    const message = error instanceof Error ? error.message : "移除收藏失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
