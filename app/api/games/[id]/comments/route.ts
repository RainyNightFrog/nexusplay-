import { NextResponse } from "next/server";
import {
  createGameComment,
  getGameCommentsByGameId,
} from "@/lib/game-comments-service";
import { sanitizePlainText } from "@/lib/sanitize";
import { createAuthServerClient } from "@/lib/supabase/server-auth";
import { MAX_COMMENT_LENGTH } from "@/lib/game-page-content";

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

    const comments = await getGameCommentsByGameId(gameId);
    return NextResponse.json({ comments });
  } catch (error) {
    const message = error instanceof Error ? error.message : "讀取評論失敗";
    return NextResponse.json({ error: message, comments: [] }, { status: 500 });
  }
}

export async function POST(
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
      return NextResponse.json({ error: "請先登入才能發表評論" }, { status: 401 });
    }

    const body = (await request.json()) as { content?: string };
    const content = sanitizePlainText(body.content ?? "", MAX_COMMENT_LENGTH);

    if (!content) {
      return NextResponse.json({ error: "請輸入評論內容" }, { status: 400 });
    }

    const comment = await createGameComment(
      { gameId, userId: user.id, content },
      authClient
    );

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "發表評論失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
