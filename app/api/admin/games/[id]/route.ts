import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import {
  deleteGameAsAdmin,
  updateGameApproval,
  writeAdminLog,
} from "@/lib/admin-service";
import { triggerNewGameFollowerNotify } from "@/lib/creator-follow-notify";
import { onCreatorGameWentLive } from "@/lib/achievement-unlock-service";
import { triggerWebSubFeedPing } from "@/lib/websub-service";
import { createServerSupabase } from "@/lib/supabase-server";

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

    const supabase = createServerSupabase();
    const { data: before } = await supabase
      .from("games")
      .select("status")
      .eq("id", gameId)
      .maybeSingle();

    const { game, logDetails } = await updateGameApproval(
      gameId,
      body.status,
      body.details
    );

    if (
      body.status === "approved" &&
      before?.status !== "approved" &&
      game.publish_status === "public" &&
      game.creator_id
    ) {
      void triggerNewGameFollowerNotify({
        gameId: game.id,
        creatorId: game.creator_id,
        gameTitle: game.title,
      });
      void onCreatorGameWentLive(supabase, game.creator_id);
      triggerWebSubFeedPing();
    }

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

export async function DELETE(
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

    let violationReason: string | undefined;
    try {
      const body = (await request.json()) as { reason?: unknown };
      if (typeof body.reason === "string") {
        violationReason = body.reason;
      }
    } catch {
      violationReason = undefined;
    }

    if (!violationReason?.trim()) {
      return NextResponse.json({ error: "請填寫違規原因" }, { status: 400 });
    }

    const { logDetails } = await deleteGameAsAdmin(gameId, violationReason);

    await writeAdminLog(
      auth.supabase!,
      auth.user!.id,
      "delete_game",
      logDetails
    );

    return NextResponse.json({ ok: true, id: gameId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "刪除遊戲失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
