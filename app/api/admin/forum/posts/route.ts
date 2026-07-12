import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { listAdminForumPosts } from "@/lib/admin-forum-moderation-service";

export async function GET(request: Request) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") ?? undefined;
    const limit = Number.parseInt(searchParams.get("limit") ?? "50", 10);

    const posts = await listAdminForumPosts({ query, limit });
    return NextResponse.json({ posts });
  } catch (error) {
    const message = error instanceof Error ? error.message : "讀取論壇貼文失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
