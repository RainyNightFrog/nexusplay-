import { NextResponse } from "next/server";
import { authorizeGameEdit } from "@/lib/game-auth";
import { resolveUserRole } from "@/lib/auth-profile";
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

  if (role !== "creator") {
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

  return {
    user,
    record: authResult.record,
    isOrphan: authResult.isOrphan,
    supabase,
  };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const numericId = Number.parseInt(id, 10);

    if (Number.isNaN(numericId)) {
      return NextResponse.json({ error: "無效的遊戲 ID" }, { status: 400 });
    }

    const authResult = await authorizeCreatorForGame(numericId);
    if ("error" in authResult && authResult.error) {
      return authResult.error;
    }

    return NextResponse.json({
      game: authResult.record,
      isOrphan: authResult.isOrphan,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "讀取遊戲失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
