import { NextResponse } from "next/server";
import { resolveUserRole, hasCreatorDashboardAccess } from "@/lib/auth-profile";
import { createAuthServerClient } from "@/lib/supabase/server-auth";

export const maxDuration = 60;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const numericId = Number.parseInt(id, 10);

    if (Number.isNaN(numericId)) {
      return NextResponse.json({ error: "無效的遊戲 ID" }, { status: 400 });
    }

    const authClient = await createAuthServerClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "請先登入" }, { status: 401 });
    }

    const role = await resolveUserRole(authClient, user);

    if (!hasCreatorDashboardAccess(user, role)) {
      return NextResponse.json(
        { error: "需要創作者身分才能更新遊戲" },
        { status: 403 }
      );
    }

    const { patchCreatorGame, mapUpdateError } = await import(
      "@/lib/game-update-server"
    );

    try {
      return await patchCreatorGame({
        request,
        numericId,
        user,
        authClient,
      });
    } catch (error) {
      return mapUpdateError(error);
    }
  } catch (error) {
    const { mapUpdateError } = await import("@/lib/game-update-server");
    return mapUpdateError(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const numericId = Number.parseInt(id, 10);

    if (Number.isNaN(numericId)) {
      return NextResponse.json({ error: "無效的遊戲 ID" }, { status: 400 });
    }

    const authClient = await createAuthServerClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "請先登入" }, { status: 401 });
    }

    const role = await resolveUserRole(authClient, user);

    if (!hasCreatorDashboardAccess(user, role)) {
      return NextResponse.json(
        { error: "需要創作者身分才能刪除遊戲" },
        { status: 403 }
      );
    }

    const { deleteCreatorGame } = await import("@/lib/game-update-server");
    return deleteCreatorGame({ numericId, user });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "刪除遊戲失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
