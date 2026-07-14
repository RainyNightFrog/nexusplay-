import type { SupabaseClient } from "@supabase/supabase-js";
import type { LeaderboardRanks } from "@/lib/profile-showcase-tags";
import {
  getVirtualPlatformLeaderboardEntries,
  VIRTUAL_LEADERBOARD_USER_PREFIX,
} from "@/lib/platform-leaderboard-virtual";

type ActivityColumn =
  | "total_online_time"
  | "total_play_time"
  | "total_donated";

async function getRealUserRank(
  supabase: SupabaseClient,
  userId: string,
  column: ActivityColumn
): Promise<number | null> {
  const { data: mine, error: mineError } = await supabase
    .from("user_activity_stats")
    .select(column)
    .eq("user_id", userId)
    .maybeSingle();

  if (mineError) throw new Error(mineError.message);

  const row = mine as Record<ActivityColumn, number | null | undefined> | null;
  const value = Number(row?.[column] ?? 0);
  if (!Number.isFinite(value) || value <= 0) return null;

  const { count, error: countError } = await supabase
    .from("user_activity_stats")
    .select("user_id", { count: "exact", head: true })
    .gt(column, value);

  if (countError) throw new Error(countError.message);

  return (count ?? 0) + 1;
}

function findRankInBoard(
  entries: { userId: string; rank: number }[],
  lookupUserId: string
): number | null {
  return entries.find((entry) => entry.userId === lookupUserId)?.rank ?? null;
}

/**
 * 玩家資料卡展示標籤用名次：勿再呼叫完整排行榜組裝（約 3 秒）。
 * - 虛擬玩家：只讀本機虛擬榜
 * - 真實玩家：用 COUNT 估名次
 */
export async function resolvePlayerLeaderboardRanks(
  supabase: SupabaseClient,
  options: {
    userId?: string | null;
    virtualPlayerId?: string | null;
    viewerUserId?: string | null;
    viewerIsAdmin?: boolean;
  }
): Promise<LeaderboardRanks> {
  if (options.virtualPlayerId) {
    const lookupUserId = `${VIRTUAL_LEADERBOARD_USER_PREFIX}${options.virtualPlayerId}`;
    const boards = getVirtualPlatformLeaderboardEntries(options.viewerUserId);
    return {
      online: findRankInBoard(boards.online, lookupUserId),
      playTime: findRankInBoard(boards.playTime, lookupUserId),
      donated: findRankInBoard(boards.donated, lookupUserId),
    };
  }

  if (!options.userId) {
    return { online: null, playTime: null, donated: null };
  }

  const [online, playTime, donated] = await Promise.all([
    getRealUserRank(supabase, options.userId, "total_online_time"),
    getRealUserRank(supabase, options.userId, "total_play_time"),
    getRealUserRank(supabase, options.userId, "total_donated"),
  ]);

  return { online, playTime, donated };
}
