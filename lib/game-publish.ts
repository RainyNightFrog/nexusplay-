import type { GameRecord } from "@/lib/supabase";

export const GAME_PUBLISH_STATUSES = ["draft", "public"] as const;
export type GamePublishStatus = (typeof GAME_PUBLISH_STATUSES)[number];

export const DEFAULT_PUBLISH_STATUS: GamePublishStatus = "draft";

export type GameMonetizationPayload = {
  publish_status: GamePublishStatus;
  tips_enabled: boolean;
  suggested_tip_amount: number | null;
};

export type ParsedMonetizationInput = GameMonetizationPayload;

const MAX_SUGGESTED_TIP = 99_999.99;

export function parsePublishStatus(value: unknown): GamePublishStatus {
  return value === "public" ? "public" : "draft";
}

export function parseMonetizationFromFormData(
  formData: FormData
): { ok: true; data: ParsedMonetizationInput } | { ok: false; error: string } {
  const publishStatus = parsePublishStatus(formData.get("publishStatus"));
  const tipsEnabled =
    String(formData.get("tipsEnabled") ?? "false") === "true";
  const suggestedRaw = String(formData.get("suggestedTipAmount") ?? "").trim();

  if (!tipsEnabled) {
    return {
      ok: true,
      data: {
        publish_status: publishStatus,
        tips_enabled: false,
        suggested_tip_amount: null,
      },
    };
  }

  if (!suggestedRaw) {
    return { ok: false, error: "請輸入建議打賞金額" };
  }

  const parsed = Number.parseFloat(suggestedRaw);
  if (
    !Number.isFinite(parsed) ||
    parsed < 0 ||
    parsed > MAX_SUGGESTED_TIP
  ) {
    return {
      ok: false,
      error: `建議打賞金額須為 0 至 ${MAX_SUGGESTED_TIP.toLocaleString()} 之間的數字`,
    };
  }

  return {
    ok: true,
    data: {
      publish_status: publishStatus,
      tips_enabled: true,
      suggested_tip_amount: Math.round(parsed * 100) / 100,
    },
  };
}

export function canViewGame(
  record: Pick<GameRecord, "publish_status" | "creator_id" | "status">,
  userId?: string | null,
  options?: { isAdmin?: boolean }
) {
  if (options?.isAdmin) {
    return true;
  }

  if (userId && record.creator_id && userId === record.creator_id) {
    return true;
  }

  return record.publish_status === "public" && record.status === "approved";
}

export function normalizePublishStatus(
  value: string | null | undefined
): GamePublishStatus {
  return value === "public" ? "public" : "draft";
}
