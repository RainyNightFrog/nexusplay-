import { authorizeGameEdit } from "@/lib/game-auth";
import { deleteGameAndAssets } from "@/lib/game-delete-server";
import { GAME_GENRES } from "@/lib/game-metadata";
import { parsePublishStatus } from "@/lib/game-publish";
import { resolvePlatformFeePercentForSave } from "@/lib/tip-fee-policy";
import { sanitizePlainText } from "@/lib/sanitize";
import { createServerSupabase } from "@/lib/supabase-server";
import {
  MAX_CATEGORY_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MAX_TITLE_LENGTH,
} from "@/lib/upload-limits";

const MAX_SUGGESTED_TIP = 99_999.99;

export type CreatorGameJsonPatch = {
  title?: string;
  description?: string;
  category?: string;
  publishStatus?: "draft" | "public";
  tipsEnabled?: boolean;
  suggestedTipAmount?: number | null;
};

export type CreatorGameApiResult =
  | { ok: true; game: Record<string, unknown> }
  | { ok: false; status: number; error: string };

function readOptionalString(value: unknown, max: number) {
  if (value === undefined) return undefined;
  if (typeof value !== "string") return null;
  const trimmed = sanitizePlainText(value, max).trim();
  return trimmed || null;
}

export async function patchCreatorGameJson(params: {
  creatorId: string;
  gameId: number;
  patch: CreatorGameJsonPatch;
}): Promise<CreatorGameApiResult> {
  const supabase = createServerSupabase();
  const authResult = await authorizeGameEdit(
    supabase,
    params.gameId,
    params.creatorId
  );

  if (!authResult.ok) {
    return { ok: false, status: authResult.status, error: authResult.message };
  }

  const record = authResult.record;
  const payload: Record<string, unknown> = {};

  const title = readOptionalString(params.patch.title, MAX_TITLE_LENGTH);
  if (title === null) {
    return { ok: false, status: 400, error: "請提供有效的遊戲名稱" };
  }
  if (title !== undefined) payload.title = title;

  const description = readOptionalString(
    params.patch.description,
    MAX_DESCRIPTION_LENGTH
  );
  if (description === null) {
    return { ok: false, status: 400, error: "請提供有效的遊戲簡介" };
  }
  if (description !== undefined) payload.description = description;

  const category = readOptionalString(params.patch.category, MAX_CATEGORY_LENGTH);
  if (category === null) {
    return { ok: false, status: 400, error: "請提供有效的遊戲分類" };
  }
  if (category !== undefined) {
    if (!(GAME_GENRES as readonly string[]).includes(category)) {
      return { ok: false, status: 400, error: "無效的遊戲分類" };
    }
    payload.category = category;
  }

  if (params.patch.publishStatus !== undefined) {
    payload.publish_status = parsePublishStatus(params.patch.publishStatus);
    if (params.patch.publishStatus === "public") {
      payload.status = "pending";
    }
  }

  if (params.patch.tipsEnabled !== undefined) {
    payload.tips_enabled = params.patch.tipsEnabled;

    if (!params.patch.tipsEnabled) {
      payload.suggested_tip_amount = null;
    } else if (params.patch.suggestedTipAmount != null) {
      const amount = params.patch.suggestedTipAmount;
      if (
        !Number.isFinite(amount) ||
        amount < 0 ||
        amount > MAX_SUGGESTED_TIP
      ) {
        return {
          ok: false,
          status: 400,
          error: `建議打賞金額須為 0 至 ${MAX_SUGGESTED_TIP.toLocaleString()} 之間`,
        };
      }
      payload.suggested_tip_amount = Math.round(amount * 100) / 100;
    } else if (record.suggested_tip_amount == null) {
      return { ok: false, status: 400, error: "開啟打賞時請提供 suggestedTipAmount" };
    }

    if (
      params.patch.tipsEnabled &&
      !record.tips_enabled
    ) {
      payload.platform_fee_percent = resolvePlatformFeePercentForSave(
        record.platform_fee_percent,
        true
      );
    }
  } else if (params.patch.suggestedTipAmount !== undefined) {
    if (params.patch.suggestedTipAmount == null) {
      payload.suggested_tip_amount = null;
    } else {
      const amount = params.patch.suggestedTipAmount;
      if (
        !Number.isFinite(amount) ||
        amount < 0 ||
        amount > MAX_SUGGESTED_TIP
      ) {
        return { ok: false, status: 400, error: "建議打賞金額無效" };
      }
      payload.suggested_tip_amount = Math.round(amount * 100) / 100;
    }
  }

  if (Object.keys(payload).length === 0) {
    return { ok: false, status: 400, error: "請提供至少一個要更新的欄位" };
  }

  if (authResult.isOrphan) {
    payload.creator_id = params.creatorId;
  }

  let updateQuery = supabase
    .from("games")
    .update(payload)
    .eq("id", params.gameId);

  if (authResult.isOrphan) {
    updateQuery = updateQuery.is("creator_id", null);
  } else {
    updateQuery = updateQuery.eq("creator_id", params.creatorId);
  }

  const { data, error } = await updateQuery.select().single();

  if (error) {
    return { ok: false, status: 500, error: error.message };
  }

  return { ok: true, game: data as Record<string, unknown> };
}

export async function deleteCreatorGameForUser(params: {
  creatorId: string;
  gameId: number;
}): Promise<CreatorGameApiResult> {
  const supabase = createServerSupabase();
  const authResult = await authorizeGameEdit(
    supabase,
    params.gameId,
    params.creatorId
  );

  if (!authResult.ok) {
    return { ok: false, status: authResult.status, error: authResult.message };
  }

  await deleteGameAndAssets(supabase, authResult.record, {
    mode: "creator",
    userId: params.creatorId,
    isOrphan: authResult.isOrphan,
  });

  return { ok: true, game: { id: params.gameId } };
}
