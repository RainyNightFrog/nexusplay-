import { NextResponse } from "next/server";
import { isAdminUser } from "@/lib/admin-auth";
import { resolveUserRole, hasCreatorDashboardAccess } from "@/lib/auth-profile";
import { authorizeGameEdit } from "@/lib/game-auth";
import {
  createLegacyImports,
  listLegacyImports,
} from "@/lib/legacy-import";
import { createAuthServerClient } from "@/lib/supabase/server-auth";
import { createServerSupabase } from "@/lib/supabase-server";

async function authorizeCreatorForGame(gameId: number) {
  const authClient = await createAuthServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return { error: NextResponse.json({ error: "請先登入" }, { status: 401 }) };
  }

  const role = await resolveUserRole(authClient, user);
  if (!hasCreatorDashboardAccess(user, role) && !isAdminUser(user)) {
    return {
      error: NextResponse.json(
        { error: "需要創作者身分才能管理遷移碼" },
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

  return { user, supabase };
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

    const entries = await listLegacyImports(authResult.supabase, gameId);
    return NextResponse.json({ entries });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "讀取遷移碼列表失敗";
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
      entries?: Array<{ label?: string; save?: unknown }>;
    };

    const entries = body.entries ?? [];
    if (entries.length === 0) {
      return NextResponse.json({ error: "請提供至少一筆存檔資料" }, { status: 400 });
    }
    if (entries.length > 20) {
      return NextResponse.json(
        { error: "一次最多建立 20 組遷移碼" },
        { status: 400 }
      );
    }

    const created = await createLegacyImports(
      authResult.supabase,
      gameId,
      authResult.user.id,
      entries
    );

    return NextResponse.json({ codes: created });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "建立遷移碼失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
