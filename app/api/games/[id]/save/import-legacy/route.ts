import { NextResponse } from "next/server";
import { isAdminUser } from "@/lib/admin-auth";
import { canViewGame } from "@/lib/game-publish";
import {
  loadGameSave,
  upsertGameSave,
  validateSavePayload,
} from "@/lib/game-save";
import { redeemLegacyImportCode } from "@/lib/legacy-import";
import { mergeGameSaves } from "@/lib/nexusplay-save-merge";
import { createAuthServerClient } from "@/lib/supabase/server-auth";
import { createServerSupabase } from "@/lib/supabase-server";

async function authorizePlayerForGame(gameId: number) {
  const authClient = await createAuthServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return {
      error: NextResponse.json({ error: "請先登入 NexusPlay 帳號" }, { status: 401 }),
    };
  }

  const supabase = createServerSupabase();
  const { data: record, error: recordError } = await supabase
    .from("games")
    .select("id, publish_status, creator_id, status")
    .eq("id", gameId)
    .maybeSingle();

  if (recordError) {
    throw new Error(`讀取遊戲失敗：${recordError.message}`);
  }

  if (!record) {
    return {
      error: NextResponse.json({ error: "找不到此遊戲" }, { status: 404 }),
    };
  }

  if (!canViewGame(record, user.id, { isAdmin: isAdminUser(user) })) {
    return {
      error: NextResponse.json({ error: "找不到此遊戲" }, { status: 404 }),
    };
  }

  return { user, authClient, supabase };
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

    const authResult = await authorizePlayerForGame(gameId);
    if ("error" in authResult && authResult.error) {
      return authResult.error;
    }

    const body = (await request.json()) as { code?: string };
    const code = body.code?.trim();
    if (!code) {
      return NextResponse.json({ error: "請輸入遷移碼" }, { status: 400 });
    }

    const legacyRecord = await redeemLegacyImportCode(
      authResult.supabase,
      gameId,
      authResult.user.id,
      code
    );

    const importedSave = legacyRecord.save_data as Record<string, unknown>;
    if (!validateSavePayload(importedSave)) {
      return NextResponse.json({ error: "遷移碼內的存檔格式無效" }, { status: 500 });
    }

    const existing = await loadGameSave(
      authResult.authClient,
      gameId,
      authResult.user.id
    );
    const existingSave =
      existing?.save_data &&
      typeof existing.save_data === "object" &&
      !Array.isArray(existing.save_data)
        ? (existing.save_data as Record<string, unknown>)
        : null;

    const merged =
      mergeGameSaves(existingSave, importedSave) ?? importedSave;

    const saved = await upsertGameSave(
      authResult.authClient,
      gameId,
      authResult.user.id,
      merged
    );

    return NextResponse.json({
      save: saved.save_data,
      updatedAt: saved.updated_at,
      imported: true,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "兌換遷移碼失敗";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
