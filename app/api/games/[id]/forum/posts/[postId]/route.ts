import { NextResponse } from "next/server";
import { getForumPostById } from "@/lib/forum-service";

function parseId(raw: string) {
  const value = Number.parseInt(raw, 10);
  return Number.isNaN(value) ? null : value;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; postId: string }> }
) {
  try {
    const { id, postId } = await params;
    const gameId = parseId(id);
    const numericPostId = parseId(postId);

    if (!gameId || !numericPostId) {
      return NextResponse.json({ error: "無效的 ID" }, { status: 400 });
    }

    const post = await getForumPostById(gameId, numericPostId);

    if (!post) {
      return NextResponse.json({ error: "找不到此貼文" }, { status: 404 });
    }

    return NextResponse.json({ post });
  } catch (error) {
    const message = error instanceof Error ? error.message : "讀取貼文失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
