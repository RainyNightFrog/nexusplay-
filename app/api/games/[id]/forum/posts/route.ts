import { NextResponse } from "next/server";
import {
  FORUM_LIMITS,
  VALID_FORUM_CATEGORIES,
  type ForumCategory,
} from "@/lib/forum";
import { createForumPost, getForumPostsByGameId } from "@/lib/forum-service";
import { triggerForumWebSubPing } from "@/lib/websub-service";
import { sanitizePlainText } from "@/lib/sanitize-plain";
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

    const posts = await getForumPostsByGameId(gameId);
    return NextResponse.json({ posts });
  } catch (error) {
    const message = error instanceof Error ? error.message : "讀取討論區失敗";
    return NextResponse.json({ error: message, posts: [] }, { status: 500 });
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
      return NextResponse.json({ error: "請先登入才能參與討論" }, { status: 401 });
    }

    const body = (await request.json()) as {
      title?: string;
      category?: string;
      content?: string;
    };

    const title = sanitizePlainText(body.title ?? "", FORUM_LIMITS.title);
    const content = sanitizePlainText(body.content ?? "", FORUM_LIMITS.content);
    const category = body.category as ForumCategory;

    if (!title) {
      return NextResponse.json({ error: "請輸入貼文標題" }, { status: 400 });
    }
    if (!content) {
      return NextResponse.json({ error: "請輸入貼文內容" }, { status: 400 });
    }
    if (!category || !VALID_FORUM_CATEGORIES.includes(category)) {
      return NextResponse.json({ error: "請選擇有效的貼文分類" }, { status: 400 });
    }

    const post = await createForumPost(
      {
        gameId,
        userId: user.id,
        title,
        category,
        content,
      },
      authClient
    );

    triggerForumWebSubPing();

    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "發布討論失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
