import { NextResponse } from "next/server";
import {
  createForumComment,
  forumPostExists,
  getForumCommentsByPostId,
} from "@/lib/forum-service";
import { FORUM_LIMITS } from "@/lib/forum";
import { isForumContentEmpty } from "@/lib/forum-content";
import { resolveRequestLocale } from "@/lib/request-locale";
import { sanitizeRichHtml } from "@/lib/sanitize-rich-html";
import { createAuthServerClient } from "@/lib/supabase/server-auth";

function parseId(raw: string) {
  const value = Number.parseInt(raw, 10);
  return Number.isNaN(value) ? null : value;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await params;
    const numericPostId = parseId(postId);
    const locale = await resolveRequestLocale(request);

    if (!numericPostId || numericPostId < 1) {
      return NextResponse.json({ error: "無效的 ID" }, { status: 400 });
    }

    const exists = await forumPostExists(numericPostId);
    if (!exists) {
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
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await params;
    const numericPostId = parseId(postId);

    if (!numericPostId || numericPostId < 1) {
      return NextResponse.json({ error: "無效的 ID" }, { status: 400 });
    }

    const authClient = await createAuthServerClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "請先登入才能參與討論" }, { status: 401 });
    }

    const exists = await forumPostExists(numericPostId);
    if (!exists) {
      return NextResponse.json({ error: "找不到此貼文" }, { status: 404 });
    }

    const body = (await request.json()) as { content?: string };
    const content = sanitizeRichHtml(body.content ?? "", FORUM_LIMITS.comment);

    if (isForumContentEmpty(content)) {
      return NextResponse.json({ error: "請輸入回覆內容" }, { status: 400 });
    }

    const comment = await createForumComment(
      {
        postId: numericPostId,
        userId: user.id,
        content,
      },
      authClient
    );

    const { notifyForumPostAuthorOfReply } = await import("@/lib/forum-reply-notify");
    void notifyForumPostAuthorOfReply({
      postId: numericPostId,
      gameId: null,
      replierUserId: user.id,
      replyContent: content,
    });

    return NextResponse.json({ comment, postId: numericPostId }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "發表回覆失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
