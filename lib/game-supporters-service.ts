import { createServerSupabase } from "@/lib/supabase-server";

export type GameSupporter = {
  displayName: string;
  amountUsd: number;
  createdAt: string;
  anonymous: boolean;
};

export async function listGameSupporters(
  gameId: number,
  limit = 12
): Promise<GameSupporter[]> {
  const supabase = createServerSupabase();

  const { data: tips, error } = await supabase
    .from("game_tips")
    .select("payer_id, amount_usd, created_at, public_anonymous")
    .eq("game_id", gameId)
    .in("status", ["succeeded", "preview"])
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
    (payers ?? []).map((payer) => [payer.id, payer.display_name as string])
  );

  return tips.map((tip) => ({
    displayName: tip.public_anonymous
      ? "__anonymous__"
      : payerMap.get(tip.payer_id as string) ?? "Supporter",
    amountUsd:
      Math.round(Number.parseFloat(String(tip.amount_usd)) * 100) / 100,
    createdAt: tip.created_at as string,
    anonymous: tip.public_anonymous === true,
  }));
}
