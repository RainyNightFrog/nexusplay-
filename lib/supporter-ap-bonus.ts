import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getSupporterPassBonusAp,
  parseSupporterPassTierId,
  resolveSupporterPassCheckout,
  type ResolvedSupporterPassCheckout,
} from "@/lib/supporter-pass";
import { createServerSupabase } from "@/lib/supabase-server";

export const SUPPORTER_PASS_BONUS_REASON = "supporter_pass_bonus" as const;

export type CreditSupporterPassBonusParams = {
  userId: string;
  bonusAp: number;
  refType: "order" | "stripe_invoice";
  refId: string;
  supabase?: SupabaseClient;
};

/**
 * 發放支持者方案贈送 AP（ledger 冪等：同 reason + ref_type + ref_id 不重複入帳）
 */
export async function creditSupporterPassBonusAp(
  params: CreditSupporterPassBonusParams
): Promise<{ credited: boolean; amount: number }> {
  const amount = Math.floor(params.bonusAp);
  if (!params.userId || !params.refId || amount <= 0) {
    return { credited: false, amount: 0 };
  }

  const supabase = params.supabase ?? createServerSupabase();
  const { data, error } = await supabase.rpc("credit_ap", {
    p_user_id: params.userId,
    p_amount: amount,
    p_reason: SUPPORTER_PASS_BONUS_REASON,
    p_ref_type: params.refType,
    p_ref_id: params.refId,
  });

  if (error) {
    throw new Error(`發放支持者贈送 AP 失敗：${error.message}`);
  }

  return { credited: data === true, amount };
}

export async function creditSupporterPassBonusForCheckout(params: {
  userId: string;
  orderId: string;
  checkout: ResolvedSupporterPassCheckout;
  supabase?: SupabaseClient;
}) {
  return creditSupporterPassBonusAp({
    userId: params.userId,
    bonusAp: getSupporterPassBonusAp(params.checkout),
    refType: "order",
    refId: params.orderId,
    supabase: params.supabase,
  });
}

/** 依方案 id（與可選實付金額）解析續訂應贈 AP */
export function resolveSupporterBonusApFromTierMetadata(input: {
  tierId: string | null | undefined;
  amountPaidCents?: number | null;
}): number {
  const tierId = String(input.tierId ?? "").trim();
  if (!tierId) return 0;

  const customAmountUsd =
    typeof input.amountPaidCents === "number" &&
    Number.isFinite(input.amountPaidCents) &&
    input.amountPaidCents > 0
      ? input.amountPaidCents / 100
      : undefined;

  const resolved = resolveSupporterPassCheckout({
    tierId,
    customAmountUsd,
  });
  if (!resolved.ok) {
    const tier = parseSupporterPassTierId(tierId);
    return tier?.bonusAp ?? 0;
  }

  return getSupporterPassBonusAp(resolved.checkout);
}
