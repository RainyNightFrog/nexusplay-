import { NextResponse } from "next/server";
import { isAdminUser } from "@/lib/admin-auth";
import {
  loadGameSave,
  upsertGameSave,
  validateSavePayload,
} from "@/lib/game-save";
import { canViewGame } from "@/lib/game-publish";
import { resolvePurchaseEntitlementForGame } from "@/lib/game-entitlement-service";
import { createAuthServerClient } from "@/lib/supabase/server-auth";
import { createServerSupabase } from "@/lib/supabase-server";

async function authorizePlayerForGame(gameId: number) {
  const authClient = await createAuthServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return {
      error: NextResponse.json({ error: "請先登入", save: null }, { status: 401 }),
    };
  }

  const supabase = createServerSupabase();
  const { data: record, error: recordError } = await supabase
    .from("games")
    .select("id, publish_status, creator_id, status, pricing_type, price, min_price")
    .eq("id", gameId)
    .maybeSingle();

  if (recordError) {
    throw new Error(`讀取遊戲失敗：${recordError.message}`);
  }

  if (!record) {
    return {
      error: NextResponse.json({ error: "找不到此遊戲", save: null }, { status: 404 }),
    };
  }

  const hasPurchaseEntitlement = await resolvePurchaseEntitlementForGame(
    supabase,
    gameId,
    user.id
  );

  if (
    !canViewGame(record, user.id, {
      isAdmin: isAdminUser(user),
      hasPurchaseEntitlement,
    })
  ) {
    return {
      error: NextResponse.json({ error: "找不到此遊戲", save: null }, { status: 404 }),
    };
  }

  return { user, authClient };
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

    const authResult = await authorizePlayerForGame(gameId);
    if ("error" in authResult && authResult.error) {
      return authResult.error;
    }

    const record = await loadGameSave(
      authResult.authClient,
      gameId,
      authResult.user.id
    );

    return NextResponse.json({
      save: record?.save_data ?? null,
      updatedAt: record?.updated_at ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "讀取存檔失敗";
    return NextResponse.json({ error: message, save: null }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const gameId = Number.parseInt(id, 10);

    if (Number.isNaN(gameId)) {
      return NextResponse.json({ error: "無效的遊戲 ID" }, { status: 400 });
    }

    const authResult = await authorizePlayerForGame(gameId);
    if ("error" in authResult && authResult.error) {
      return authResult.error;
    }

    const body = (await request.json()) as { save?: unknown };
    if (!validateSavePayload(body.save)) {
      return NextResponse.json(
        { error: "存檔格式無效或超過大小上限（256 KB）" },
        { status: 400 }
      );
    }

    const record = await upsertGameSave(
      authResult.authClient,
      gameId,
      authResult.user.id,
      body.save
    );

    return NextResponse.json({
      save: record.save_data,
      updatedAt: record.updated_at,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "儲存存檔失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
