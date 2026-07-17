import type { SupabaseClient } from "@supabase/supabase-js";
import { hkdToUsd, usdCentsToHkd, usdToHkd } from "@/lib/platform-leaderboard";
import type { LeaderboardRanks } from "@/lib/profile-showcase-tags";
import {
  getVirtualPlatformLeaderboardEntries,
  VIRTUAL_LEADERBOARD_USER_PREFIX,
} from "@/lib/platform-leaderboard-virtual";

type TimeColumn = "total_online_time" | "total_play_time";

async function getUserContributionHkd(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const [{ data: activity, error: activityError }, { data: orders, error: ordersError }] =
    await Promise.all([
      supabase
        .from("user_activity_stats")
        .select("total_donated")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("orders")
        .select("total_amount_cents")
        .eq("buyer_id", userId)
        .eq("order_type", "supporter_pass")
        .eq("status", "succeeded"),
    ]);

  if (activityError) throw new Error(activityError.message);
  if (ordersError) throw new Error(ordersError.message);

  const tipsHkd = Number(activity?.total_donated ?? 0);
  const supporterHkd = (orders ?? []).reduce(
    (sum, row) => sum + usdCentsToHkd(Number(row.total_amount_cents ?? 0)),
    0
  );
  return tipsHkd + supporterHkd;
}

async function countRealUsersAboveTime(
  supabase: SupabaseClient,
  column: TimeColumn,
  value: number
): Promise<number> {
  const { count, error } = await supabase
    .from("user_activity_stats")
    .select("user_id", { count: "exact", head: true })
    .gt(column, value);

  if (error) throw new Error(error.message);
  return count ?? 0;
}

/** 貢獻榜：以 tips HKD 粗估「高於某 USD」的真實玩家數（與榜單同向比較） */
async function countRealUsersAboveDonationUsd(
  supabase: SupabaseClient,
  valueUsd: number
): Promise<number> {
  const thresholdHkd = usdToHkd(valueUsd);
  if (thresholdHkd <= 0) return 0;

  const { count, error } = await supabase
    .from("user_activity_stats")
    .select("user_id", { count: "exact", head: true })
    .gt("total_donated", thresholdHkd);

  if (error) throw new Error(error.message);
  return count ?? 0;
}

function countVirtualAbove(
  entries: { value: number }[],
  value: number
): number {
  return entries.reduce(
    (sum, entry) => (entry.value > value ? sum + 1 : sum),
    0
  );
}

async function getMergedTimeRank(
  supabase: SupabaseClient,
  userId: string,
  column: TimeColumn,
  virtualEntries: { value: number }[]
): Promise<number | null> {
  const { data: mine, error: mineError } = await supabase
    .from("user_activity_stats")
    .select(column)
    .eq("user_id", userId)
    .maybeSingle();

  if (mineError) throw new Error(mineError.message);

  const row = mine as Record<TimeColumn, number | null | undefined> | null;
  const value = Number(row?.[column] ?? 0);
  if (!Number.isFinite(value) || value <= 0) return null;

  const [realHigher, virtualHigher] = await Promise.all([
    countRealUsersAboveTime(supabase, column, value),
    Promise.resolve(countVirtualAbove(virtualEntries, value)),
  ]);

  return realHigher + virtualHigher + 1;
}

async function getMergedDonationRank(
  supabase: SupabaseClient,
  userId: string,
  virtualEntries: { value: number }[]
): Promise<number | null> {
  const contributionHkd = await getUserContributionHkd(supabase, userId);
  const valueUsd = hkdToUsd(contributionHkd);
  if (!Number.isFinite(valueUsd) || valueUsd <= 0) return null;

  const [realHigher, virtualHigher] = await Promise.all([
    countRealUsersAboveDonationUsd(supabase, valueUsd),
    Promise.resolve(countVirtualAbove(virtualEntries, valueUsd)),
  ]);

  return realHigher + virtualHigher + 1;
}

async function getMergedVirtualTimeRank(
  supabase: SupabaseClient,
  value: number,
  column: TimeColumn,
  virtualEntries: { value: number }[]
): Promise<number | null> {
  if (!Number.isFinite(value) || value <= 0) return null;

  const [realHigher, virtualHigher] = await Promise.all([
    countRealUsersAboveTime(supabase, column, value),
    Promise.resolve(countVirtualAbove(virtualEntries, value)),
  ]);

  return realHigher + virtualHigher + 1;
}

async function getMergedVirtualDonationRank(
  supabase: SupabaseClient,
  valueUsd: number,
  virtualEntries: { value: number }[]
): Promise<number | null> {
  if (!Number.isFinite(valueUsd) || valueUsd <= 0) return null;

  const [realHigher, virtualHigher] = await Promise.all([
    countRealUsersAboveDonationUsd(supabase, valueUsd),
    Promise.resolve(countVirtualAbove(virtualEntries, valueUsd)),
  ]);

  return realHigher + virtualHigher + 1;
}

/**
 * 玩家資料卡展示標籤用名次：與排行榜一致（真實 + 虛擬合併）。
 * 勿呼叫完整排行榜組裝；以 COUNT + 虛擬榜快速估算。
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
  const boards = getVirtualPlatformLeaderboardEntries(options.viewerUserId);

  if (options.virtualPlayerId) {
    const lookupUserId = `${VIRTUAL_LEADERBOARD_USER_PREFIX}${options.virtualPlayerId}`;
    const onlineEntry = boards.online.find(
      (entry) => entry.userId === lookupUserId
    );
    const playEntry = boards.playTime.find(
      (entry) => entry.userId === lookupUserId
    );
    const donatedEntry = boards.donated.find(
      (entry) => entry.userId === lookupUserId
    );

    const [online, playTime, donated] = await Promise.all([
      onlineEntry
        ? getMergedVirtualTimeRank(
            supabase,
            onlineEntry.value,
            "total_online_time",
            boards.online
          )
        : Promise.resolve(null),
      playEntry
        ? getMergedVirtualTimeRank(
            supabase,
            playEntry.value,
            "total_play_time",
            boards.playTime
          )
        : Promise.resolve(null),
      donatedEntry
        ? getMergedVirtualDonationRank(
            supabase,
            donatedEntry.value,
            boards.donated
          )
        : Promise.resolve(null),
    ]);

    return { online, playTime, donated };
  }

  if (!options.userId) {
    return { online: null, playTime: null, donated: null };
  }

  const [online, playTime, donated] = await Promise.all([
    getMergedTimeRank(
      supabase,
      options.userId,
      "total_online_time",
      boards.online
    ),
    getMergedTimeRank(
      supabase,
      options.userId,
      "total_play_time",
      boards.playTime
    ),
    getMergedDonationRank(supabase, options.userId, boards.donated),
  ]);

  return { online, playTime, donated };
}
