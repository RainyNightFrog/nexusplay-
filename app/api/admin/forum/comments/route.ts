import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { listAdminForumComments } from "@/lib/admin-forum-moderation-service";

export async function GET(request: Request) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const postId = searchParams.get("postId");
    const limit = Number.parseInt(searchParams.get("limit") ?? "50", 10);

    const comments = await listAdminForumComments({
      postId: postId ? Number.parseInt(postId, 10) : undefined,
      limit,
    });

    return NextResponse.json({ comments });
  } catch (error) {
    const message = error instanceof Error ? error.message : "讀取論壇留言失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
