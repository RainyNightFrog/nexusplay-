import { NextResponse } from "next/server";
import { authorizeGameEdit } from "@/lib/game-auth";
import { resolveUserRole, hasCreatorDashboardAccess } from "@/lib/auth-profile";
import { createAuthServerClient } from "@/lib/supabase/server-auth";
import { createServerSupabase } from "@/lib/supabase-server";
import {
  createGameAccessCode,
  deleteGameAccessCode,
  listGameAccessCodes,
} from "@/lib/partner-access-service";

async function authorizeCreatorForGame(gameId: number) {
  const authClient = await createAuthServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return { error: NextResponse.json({ error: "請先登入" }, { status: 401 }) };
  }

  const role = await resolveUserRole(authClient, user);
  if (!hasCreatorDashboardAccess(user, role)) {
    return {
      error: NextResponse.json(
        { error: "需要創作者身分才能編輯遊戲" },
        { status: 403 }
      ),
    };
  }

  const supabase = createServerSupabase();
  const authResult = await authorizeGameEdit(supabase, gameId, user.id);
  if (!authResult.ok) {
    return {
      error: NextResponse.json(
        { error: authResult.message },
        { status: authResult.status }
      ),
    };
  }

  return { user, record: authResult.record };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const gameId = Number.parseInt(id, 10);
    if (Number.isNaN(gameId)) {
      return NextResponse.json({ error: "無效的遊戲 ID" }, { status: 400 });
    }

    const authResult = await authorizeCreatorForGame(gameId);
    if ("error" in authResult && authResult.error) {
      return authResult.error;
    }

    const codes = await listGameAccessCodes(gameId, authResult.user.id);
    return NextResponse.json({ codes });
  } catch (error) {
    const message = error instanceof Error ? error.message : "讀取試玩碼失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const gameId = Number.parseInt(id, 10);
    if (Number.isNaN(gameId)) {
      return NextResponse.json({ error: "無效的遊戲 ID" }, { status: 400 });
    }

    const authResult = await authorizeCreatorForGame(gameId);
    if ("error" in authResult && authResult.error) {
      return authResult.error;
    }

    const body = (await request.json()) as {
      label?: string;
      maxUses?: number | null;
      expiresAt?: string | null;
    };

    const maxUses =
      typeof body.maxUses === "number" && body.maxUses > 0
        ? Math.min(body.maxUses, 10_000)
        : null;

    const code = await createGameAccessCode({
      gameId,
      creatorId: authResult.user.id,
      label: body.label,
      maxUses,
      expiresAt: body.expiresAt ?? null,
    });

    return NextResponse.json({ code });
  } catch (error) {
    const message = error instanceof Error ? error.message : "建立試玩碼失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const gameId = Number.parseInt(id, 10);
    if (Number.isNaN(gameId)) {
      return NextResponse.json({ error: "無效的遊戲 ID" }, { status: 400 });
    }

    const authResult = await authorizeCreatorForGame(gameId);
    if ("error" in authResult && authResult.error) {
      return authResult.error;
    }

    const codeId = new URL(request.url).searchParams.get("codeId");
    if (!codeId) {
      return NextResponse.json({ error: "缺少 codeId" }, { status: 400 });
    }

    await deleteGameAccessCode({
      codeId,
      gameId,
      creatorId: authResult.user.id,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "刪除試玩碼失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
