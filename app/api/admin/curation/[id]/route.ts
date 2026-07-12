import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { writeAdminLog } from "@/lib/admin-service";
import { updateAdminGameCuration } from "@/lib/admin-curation-service";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { id } = await params;
    const gameId = Number.parseInt(id, 10);
    if (!Number.isFinite(gameId)) {
      return NextResponse.json({ error: "無效的遊戲 ID" }, { status: 400 });
    }

    const body = (await request.json()) as {
      isFeatured?: boolean;
      featuredBadge?: string | null;
      featuredSort?: number;
      publishStatus?: "draft" | "public";
    };

    const game = await updateAdminGameCuration({
      gameId,
      ...body,
    });

    await writeAdminLog(
      auth.supabase!,
      auth.user!.id,
      "update_curation",
      `game=${gameId} featured=${String(body.isFeatured ?? game.isFeatured)}`
    );

    return NextResponse.json({ game });
  } catch (error) {
    const message = error instanceof Error ? error.message : "更新精選設定失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
