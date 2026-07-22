import { createServerSupabase } from "@/lib/supabase-server";
import { isPaymentsLive } from "@/lib/stripe-connect";
import { resolveEquippedTitles } from "@/lib/equipped-title-service";
import type { EquippedTitle } from "@/lib/titles";

export type GameSupporter = {
  payerId: string | null;
  displayName: string;
  amountUsd: number;
  createdAt: string;
  anonymous: boolean;
  equippedTitle: EquippedTitle | null;
};

export async function listGameSupporters(
  gameId: number,
  limit = 12
): Promise<GameSupporter[]> {
  const supabase = createServerSupabase();
  const tipStatuses = isPaymentsLive() ? ["succeeded"] : ["succeeded", "preview"];

  const { data: tips, error } = await supabase
    .from("game_tips")
    .select("payer_id, amount_usd, created_at, public_anonymous")
    .eq("game_id", gameId)
    .in("status", tipStatuses)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  if (!tips || tips.length === 0) return [];

  const payerIds = [
    ...new Set(
      tips
        .filter((tip) => !tip.public_anonymous)
        .map((tip) => tip.payer_id as string)
    ),
  ];
  const { data: payers } = await supabase
    .from("profiles")
    .select("id, display_name")
    .in("id", payerIds);

  const payerMap = new Map(
    (payers ?? []).map((payer) => [
      payer.id,
      typeof payer.display_name === "string" ? payer.display_name.trim() : "",
    ])
  );

  const titleMap = await resolveEquippedTitles(supabase, payerIds);

  return tips.map((tip) => {
    const payerId = tip.payer_id as string;
    const isAnonymous = tip.public_anonymous === true;
    const displayName = isAnonymous
      ? "__anonymous__"
      : payerMap.get(payerId) || "Supporter";

    return {
      payerId: isAnonymous ? null : payerId,
      displayName,
      amountUsd:
        Math.round(Number.parseFloat(String(tip.amount_usd)) * 100) / 100,
      createdAt: tip.created_at as string,
      anonymous: isAnonymous,
      equippedTitle: isAnonymous ? null : titleMap.get(payerId) ?? null,
    };
  });
}
