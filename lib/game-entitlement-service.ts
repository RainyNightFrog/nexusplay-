import type { SupabaseClient } from "@supabase/supabase-js";
import { parsePricingType } from "@/lib/game-pricing";
import type { GameRecord } from "@/lib/supabase";
import { createServerSupabase } from "@/lib/supabase-server";

export type GameEntitlementRecord = {
  id: string;
  user_id: string;
  game_id: number;
  order_id: string | null;
  created_at: string;
};

export function gameRequiresPurchase(
  record: Pick<GameRecord, "pricing_type" | "price" | "min_price">
): boolean {
  const pricingType = parsePricingType(record.pricing_type);
  if (pricingType === "free") return false;
  if (pricingType === "fixed") {
    return typeof record.price === "number" && record.price > 0;
  }
  if (pricingType === "pwyw") {
    const minPrice =
      typeof record.min_price === "number" ? record.min_price : 0;
    return minPrice > 0;
  }
  return false;
}

export async function hasGameEntitlement(
  supabase: SupabaseClient,
  userId: string | null | undefined,
  gameId: number
): Promise<boolean> {
  if (!userId) return false;

  const { data, error } = await supabase
    .from("game_entitlements")
    .select("id")
    .eq("user_id", userId)
    .eq("game_id", gameId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data);
}

export async function grantGameEntitlement(params: {
  userId: string;
  gameId: number;
  orderId: string;
}) {
  const supabase = createServerSupabase();

  const { data: existing } = await supabase
    .from("game_entitlements")
    .select("id")
    .eq("user_id", params.userId)
    .eq("game_id", params.gameId)
    .maybeSingle();

  if (existing) {
    return { granted: false, alreadyOwned: true };
  }

  const { error } = await supabase.from("game_entitlements").insert({
    user_id: params.userId,
    game_id: params.gameId,
    order_id: params.orderId,
  });

  if (error) {
    if (error.code === "23505") {
      return { granted: false, alreadyOwned: true };
    }
    throw new Error(error.message);
  }

  return { granted: true, alreadyOwned: false };
}

export async function resolvePurchaseEntitlementForGame(
  supabase: SupabaseClient,
  gameId: number,
  userId: string | null | undefined
) {
  if (!userId) return false;
  return hasGameEntitlement(supabase, userId, gameId);
}
