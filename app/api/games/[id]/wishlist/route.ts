import { NextResponse } from "next/server";
import {
  isGameWishlisted,
  toggleGameWishlist,
} from "@/lib/wishlist-service";
import { createAuthServerClient } from "@/lib/supabase/server-auth";

function parseGameId(raw: string) {
  const gameId = Number.parseInt(raw, 10);
  return Number.isNaN(gameId) ? null : gameId;
}

export async function GET(
  _request: Request,
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
      return NextResponse.json({ wishlisted: false });
    }

    const wishlisted = await isGameWishlisted(authClient, user.id, gameId);
    return NextResponse.json({ wishlisted });
  } catch (error) {
    const message = error instanceof Error ? error.message : "讀取願望單失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  _request: Request,
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

    const result = await toggleGameWishlist(authClient, user.id, gameId);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "更新願望單失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
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

    const { removeGameWishlist } = await import("@/lib/wishlist-service");
    await removeGameWishlist(authClient, user.id, gameId);
    return NextResponse.json({ wishlisted: false });
  } catch (error) {
    const message = error instanceof Error ? error.message : "移除願望單失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
