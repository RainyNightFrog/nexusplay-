import { createServerSupabase } from "@/lib/supabase-server";

export type PayerTipRecord = {
  id: string;
  gameId: number;
  gameTitle: string;
  amountUsd: number;
  status: string;
  createdAt: string;
};

function roundUsd(value: number | string) {
  const numeric =
    typeof value === "number" ? value : Number.parseFloat(String(value));
  return Math.round((Number.isFinite(numeric) ? numeric : 0) * 100) / 100;
}

export async function listPayerTips(
  payerId: string,
  limit = 20
): Promise<PayerTipRecord[]> {
  const supabase = createServerSupabase();

  const { data: tips, error } = await supabase
    .from("game_tips")
    .select("id, game_id, amount_usd, status, created_at")
    .eq("payer_id", payerId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  if (!tips || tips.length === 0) {
    return [];
  }

  const gameIds = [...new Set(tips.map((tip) => tip.game_id))];
  const { data: games, error: gamesError } = await supabase
    .from("games")
    .select("id, title")
    .in("id", gameIds);

  if (gamesError) {
    throw new Error(gamesError.message);
  }

  const titleMap = new Map(
    (games ?? []).map((game) => [game.id as number, game.title as string])
  );

  return tips.map((tip) => ({
    id: tip.id,
    gameId: tip.game_id,
    gameTitle: titleMap.get(tip.game_id) ?? "",
    amountUsd: roundUsd(tip.amount_usd),
    status: tip.status,
    createdAt: tip.created_at,
  }));
}
