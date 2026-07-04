import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { updateGameApproval, writeAdminLog } from "@/lib/admin-service";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { id } = await params;
    const gameId = Number.parseInt(id, 10);
    if (Number.isNaN(gameId)) {
      return NextResponse.json({ error: "無效的遊戲 ID" }, { status: 400 });
    }

    const body = (await request.json()) as {
      status?: "approved" | "rejected";
      details?: string;
    };

    if (body.status !== "approved" && body.status !== "rejected") {
      return NextResponse.json(
        { error: "status 必須為 approved 或 rejected" },
        { status: 400 }
      );
    }

    const { game, logDetails } = await updateGameApproval(
      gameId,
      body.status,
      body.details
    );

    await writeAdminLog(
      auth.supabase!,
      auth.user!.id,
      body.status === "approved" ? "approve_game" : "reject_game",
      logDetails ?? `遊戲 #${gameId}「${game.title}」`
    );

    return NextResponse.json({ game });
  } catch (error) {
    const message = error instanceof Error ? error.message : "更新審批狀態失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
