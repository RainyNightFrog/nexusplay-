import type { GameRecord } from "@/lib/supabase";
import { gameRequiresPurchase } from "@/lib/game-entitlement-service";
import { MIN_SUGGESTED_TIP_USD } from "@/lib/tip-limits";

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
    parsed < MIN_SUGGESTED_TIP_USD ||
    parsed > MAX_SUGGESTED_TIP
  ) {
    return {
      ok: false,
      error: `建議打賞金額須為 ${MIN_SUGGESTED_TIP_USD} 至 ${MAX_SUGGESTED_TIP.toLocaleString()} 之間的數字`,
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

export function canAccessGameStorePage(
  record: Pick<GameRecord, "publish_status" | "creator_id" | "status">,
  userId?: string | null,
  options?: {
    isAdmin?: boolean;
    hasPartnerAccess?: boolean;
  }
) {
  if (options?.isAdmin) {
    return true;
  }

  if (userId && record.creator_id && userId === record.creator_id) {
    return true;
  }

  if (options?.hasPartnerAccess && record.publish_status === "draft") {
    return true;
  }

  const approvalStatus = record.status ?? "approved";
  return record.publish_status === "public" && approvalStatus === "approved";
}

export function canPlayGame(
  record: Pick<
    GameRecord,
    | "publish_status"
    | "creator_id"
    | "status"
    | "pricing_type"
    | "price"
    | "min_price"
  >,
  userId?: string | null,
  options?: {
    isAdmin?: boolean;
    hasPartnerAccess?: boolean;
    hasPurchaseEntitlement?: boolean;
  }
) {
  if (!canAccessGameStorePage(record, userId, options)) {
    return false;
  }

  if (options?.isAdmin) {
    return true;
  }

  if (userId && record.creator_id && userId === record.creator_id) {
    return true;
  }

  if (gameRequiresPurchase(record)) {
    return options?.hasPurchaseEntitlement === true;
  }

  return true;
}

/** @deprecated Prefer `canPlayGame` for embed/play or `canAccessGameStorePage` for listings. */
export function canViewGame(
  record: Pick<
    GameRecord,
    | "publish_status"
    | "creator_id"
    | "status"
    | "pricing_type"
    | "price"
    | "min_price"
  >,
  userId?: string | null,
  options?: {
    isAdmin?: boolean;
    hasPartnerAccess?: boolean;
    hasPurchaseEntitlement?: boolean;
  }
) {
  return canPlayGame(record, userId, options);
}

export function normalizePublishStatus(
  value: string | null | undefined
): GamePublishStatus {
  return value === "public" ? "public" : "draft";
}

/** 僅在首次公開或遭拒後重新提交時才需重新審批；一般更新保留原審批狀態 */
export function resolveApprovalStatusAfterCreatorUpdate(
  record: Pick<GameRecord, "publish_status" | "status">,
  nextPublishStatus: GamePublishStatus
): GameRecord["status"] | undefined {
  if (nextPublishStatus !== "public") {
    return undefined;
  }

  const currentApproval = record.status ?? "approved";

  if (record.publish_status !== "public") {
    return "pending";
  }

  if (currentApproval === "rejected") {
    return "pending";
  }

  return undefined;
}
