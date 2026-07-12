import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { writeAdminLog } from "@/lib/admin-service";
import { moderateForumPost } from "@/lib/admin-forum-moderation-service";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { id } = await params;
    const postId = Number.parseInt(id, 10);
    if (!Number.isFinite(postId)) {
      return NextResponse.json({ error: "無效的貼文 ID" }, { status: 400 });
    }

    const body = (await request.json()) as {
      action?: "hide" | "unhide" | "lock" | "unlock" | "delete";
    };

    if (!body.action) {
      return NextResponse.json({ error: "缺少 action" }, { status: 400 });
    }

    const result = await moderateForumPost({
      postId,
      action: body.action,
      adminId: auth.user!.id,
    });

    await writeAdminLog(
      auth.supabase!,
      auth.user!.id,
      `forum_post_${body.action}`,
      `post=${postId}`
    );

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "論壇審核失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
