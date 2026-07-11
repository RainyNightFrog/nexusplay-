import type { SupabaseClient } from "@supabase/supabase-js";
import type { LeaderboardRanks } from "@/lib/profile-showcase-tags";
import { getPlatformLeaderboards } from "@/lib/platform-leaderboard-service";
import { VIRTUAL_LEADERBOARD_USER_PREFIX } from "@/lib/platform-leaderboard-virtual";

type ActivityColumn =
  | "total_online_time"
  | "total_play_time"
  | "total_donated";

async function getRealUserRankBeyondBoard(
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

export async function resolvePlayerLeaderboardRanks(
  supabase: SupabaseClient,
  options: {
    userId?: string | null;
    virtualPlayerId?: string | null;
    viewerUserId?: string | null;
    viewerIsAdmin?: boolean;
  }
): Promise<LeaderboardRanks> {
  const lookupUserId = options.virtualPlayerId
    ? `${VIRTUAL_LEADERBOARD_USER_PREFIX}${options.virtualPlayerId}`
    : options.userId ?? null;

  if (!lookupUserId) {
    return { online: null, playTime: null, donated: null };
  }

  const boards = await getPlatformLeaderboards(
    supabase,
    options.viewerUserId,
    options.viewerIsAdmin
  );

  const onlineFromBoard = findRankInBoard(boards.online, lookupUserId);
  const playTimeFromBoard = findRankInBoard(boards.playTime, lookupUserId);
  const donatedFromBoard = findRankInBoard(boards.donated, lookupUserId);

  if (options.virtualPlayerId) {
    return {
      online: onlineFromBoard,
      playTime: playTimeFromBoard,
      donated: donatedFromBoard,
    };
  }

  if (!options.userId) {
    return { online: null, playTime: null, donated: null };
  }

  const [online, playTime, donated] = await Promise.all([
    onlineFromBoard ??
      getRealUserRankBeyondBoard(supabase, options.userId, "total_online_time"),
    playTimeFromBoard ??
      getRealUserRankBeyondBoard(supabase, options.userId, "total_play_time"),
    donatedFromBoard ??
      getRealUserRankBeyondBoard(supabase, options.userId, "total_donated"),
  ]);

  return { online, playTime, donated };
}
