import { NextResponse } from "next/server";
import {
  createForumComment,
  forumPostBelongsToGame,
  getForumCommentsByPostId,
  materializeSeedForumPostIfNeeded,
} from "@/lib/forum-service";
import { FORUM_LIMITS } from "@/lib/forum";
import { resolveRequestLocale } from "@/lib/request-locale";
import { sanitizePlainText } from "@/lib/sanitize-plain";
import { createAuthServerClient } from "@/lib/supabase/server-auth";

function parseId(raw: string) {
  const value = Number.parseInt(raw, 10);
  return Number.isNaN(value) ? null : value;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; postId: string }> }
) {
  try {
    const { id, postId } = await params;
    const gameId = parseId(id);
    const numericPostId = parseId(postId);
    const locale = await resolveRequestLocale(request);

    if (!gameId || numericPostId === null) {
      return NextResponse.json({ error: "無效的 ID" }, { status: 400 });
    }

    if (numericPostId < 0) {
      const comments = await getForumCommentsByPostId(numericPostId, locale);
      return NextResponse.json({ comments });
    }

    const belongs = await forumPostBelongsToGame(numericPostId, gameId);
    if (!belongs) {
      return NextResponse.json({ error: "找不到此貼文" }, { status: 404 });
    }

    const comments = await getForumCommentsByPostId(numericPostId, locale);
    return NextResponse.json({ comments });
  } catch (error) {
    const message = error instanceof Error ? error.message : "讀取回覆失敗";
    return NextResponse.json({ error: message, comments: [] }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; postId: string }> }
) {
  try {
    const { id, postId } = await params;
    const gameId = parseId(id);
    const numericPostId = parseId(postId);

    if (!gameId || !numericPostId) {
      return NextResponse.json({ error: "無效的 ID" }, { status: 400 });
    }

    const authClient = await createAuthServerClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "請先登入才能參與討論" }, { status: 401 });
    }

    const locale = await resolveRequestLocale(request);
    let targetPostId = numericPostId;

    if (numericPostId < 0) {
      targetPostId = await materializeSeedForumPostIfNeeded(
        gameId,
        numericPostId,
        locale,
        user.id
      );
    }

    const belongs = await forumPostBelongsToGame(targetPostId, gameId);
    if (!belongs) {
      return NextResponse.json({ error: "找不到此貼文" }, { status: 404 });
    }

    const body = (await request.json()) as { content?: string };
    const content = sanitizePlainText(body.content ?? "", FORUM_LIMITS.comment);

    if (!content) {
      return NextResponse.json({ error: "請輸入回覆內容" }, { status: 400 });
    }

    const comment = await createForumComment(
      {
        postId: targetPostId,
        userId: user.id,
        content,
      },
      authClient
    );

    const { notifyForumPostAuthorOfReply } = await import("@/lib/forum-reply-notify");
    void notifyForumPostAuthorOfReply({
      postId: targetPostId,
      gameId,
      replierUserId: user.id,
      replyContent: content,
    });

    return NextResponse.json({ comment, postId: targetPostId }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "發表回覆失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
