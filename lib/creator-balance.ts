import { createServerSupabase } from "@/lib/supabase-server";

function roundUsd(value: number) {
  return Math.round(value * 100) / 100;
}

/**
 * 原子調整創作者帳本餘額（優先 RPC；未部署時帶樂觀鎖重試）。
 * deltaUsd 可為負數；結果不會低於 0。
 */
export async function adjustCreatorBalanceUsd(
  creatorId: string,
  deltaUsd: number
) {
  const delta = roundUsd(deltaUsd);
  if (!creatorId || delta === 0) return;

  const supabase = createServerSupabase();

  const { error: rpcError } = await supabase.rpc("adjust_creator_balance_usd", {
    p_user_id: creatorId,
    p_delta: delta,
  });

  if (!rpcError) return;

  // RPC 尚未部署時：讀取 → 條件更新，衝突則重試
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { data: profile, error: readError } = await supabase
      .from("profiles")
      .select("creator_balance_usd")
      .eq("id", creatorId)
      .maybeSingle();

    if (readError) {
      throw new Error(readError.message);
    }

    const current =
      typeof profile?.creator_balance_usd === "number"
        ? profile.creator_balance_usd
        : Number.parseFloat(String(profile?.creator_balance_usd ?? 0)) || 0;

    const nextBalance = roundUsd(Math.max(0, current + delta));

    let query = supabase
      .from("profiles")
      .update({ creator_balance_usd: nextBalance })
      .eq("id", creatorId);

    if (profile?.creator_balance_usd == null) {
      query = query.is("creator_balance_usd", null);
    } else {
      query = query.eq("creator_balance_usd", profile.creator_balance_usd);
    }

    const { data: updated, error: updateError } = await query
      .select("id")
      .maybeSingle();

    if (updateError) {
      throw new Error(updateError.message);
    }
    if (updated) return;
  }

  throw new Error("調整創作者餘額失敗（並發衝突）");
}
