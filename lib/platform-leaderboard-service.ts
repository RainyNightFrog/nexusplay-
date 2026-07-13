import type { SupabaseClient } from "@supabase/supabase-js";
import {
  hkdToUsd,
  isUserOnline,
  LEADERBOARD_TOP_LIMIT,
  usdCentsToHkd,
  type ActivityStatsRow,
  type PlatformLeaderboardEntry,
  type PlatformLeaderboardsResponse,
} from "@/lib/platform-leaderboard";
import { maskDonationAmount } from "@/lib/activity-stats-masking";
import { resolveEquippedTitles } from "@/lib/equipped-title-service";
import { isAmbientLocalEmail } from "@/lib/ambient-local-email";
import {
  getVirtualPlatformLeaderboardEntries,
  mergePlatformLeaderboardEntries,
} from "@/lib/platform-leaderboard-virtual";

type ProfileRow = {
  id: string;
  display_name: string;
  avatar_url: string | null;
};

const LEADERBOARD_LIMIT = LEADERBOARD_TOP_LIMIT;
const FETCH_POOL_SIZE = 80;

async function ensureActivityStatsBackfill(
  supabase: SupabaseClient
): Promise<void> {
  const { error } = await supabase.rpc("backfill_user_activity_stats");
  if (error) {
    throw new Error(`補建排行榜資料失敗：${error.message}`);
  }
}

async function listAmbientBotUserIds(
  supabase: SupabaseClient
): Promise<Set<string>> {
  const { data, error } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (error) {
    return new Set();
  }

  return new Set(
    (data.users ?? [])
      .filter((user) => isAmbientLocalEmail(user.email))
      .map((user) => user.id)
  );
}

async function fetchTopByColumn(
  supabase: SupabaseClient,
  column: "total_online_time" | "total_play_time" | "total_donated",
  excludeUserIds: Set<string>
): Promise<ActivityStatsRow[]> {
  let query = supabase
    .from("user_activity_stats")
    .select(
      "user_id, total_online_time, total_play_time, total_donated, last_active_at"
    );

  if (column === "total_donated") {
    query = query.gt("total_donated", 0);
  } else if (column === "total_online_time") {
    query = query.gt("total_online_time", 0);
  } else {
    query = query.gt("total_play_time", 0);
  }

  const { data, error } = await query
    .order(column, { ascending: false })
    .order("last_active_at", { ascending: false })
    .limit(FETCH_POOL_SIZE);

  if (error) {
    throw new Error(`讀取排行榜失敗：${error.message}`);
  }

  return ((data ?? []) as ActivityStatsRow[])
    .filter((row) => !excludeUserIds.has(row.user_id))
    .slice(0, LEADERBOARD_LIMIT);
}

type SupporterPassAggregate = {
  hkd: number;
  lastPaidAt: string;
};

async function fetchSupporterPassTotals(
  supabase: SupabaseClient,
  excludeUserIds: Set<string>
): Promise<Map<string, SupporterPassAggregate>> {
  const { data, error } = await supabase
    .from("orders")
    .select("buyer_id, total_amount_cents, created_at")
    .eq("order_type", "supporter_pass")
    .eq("status", "succeeded");

  if (error) {
    throw new Error(`讀取支持者付款紀錄失敗：${error.message}`);
  }

  const totals = new Map<string, SupporterPassAggregate>();

  for (const row of data ?? []) {
    const buyerId = row.buyer_id as string;
    if (excludeUserIds.has(buyerId)) continue;

    const paidAt = String(row.created_at ?? new Date().toISOString());
    const amountHkd = usdCentsToHkd(Number(row.total_amount_cents ?? 0));
    if (amountHkd <= 0) continue;

    const existing = totals.get(buyerId);
    totals.set(buyerId, {
      hkd: (existing?.hkd ?? 0) + amountHkd,
      lastPaidAt:
        existing && Date.parse(existing.lastPaidAt) > Date.parse(paidAt)
          ? existing.lastPaidAt
          : paidAt,
    });
  }

  return totals;
}

/** 貢獻榜：打賞（user_activity_stats）+ 平台支持者付款（orders） */
async function fetchTopContributionRows(
  supabase: SupabaseClient,
  excludeUserIds: Set<string>
): Promise<ActivityStatsRow[]> {
  const supporterTotals = await fetchSupporterPassTotals(supabase, excludeUserIds);

  const { data: tipRows, error: tipError } = await supabase
    .from("user_activity_stats")
    .select(
      "user_id, total_online_time, total_play_time, total_donated, last_active_at"
    )
    .gt("total_donated", 0)
    .order("total_donated", { ascending: false })
    .limit(FETCH_POOL_SIZE);

  if (tipError) {
    throw new Error(`讀取打賞累計失敗：${tipError.message}`);
  }

  const combined = new Map<string, ActivityStatsRow>();

  for (const row of (tipRows ?? []) as ActivityStatsRow[]) {
    if (excludeUserIds.has(row.user_id)) continue;

    const supporter = supporterTotals.get(row.user_id);
    const tipsHkd = Number(row.total_donated);
    const totalHkd = tipsHkd + (supporter?.hkd ?? 0);
    if (totalHkd <= 0) continue;

    combined.set(row.user_id, {
      ...row,
      total_donated: totalHkd,
      last_active_at:
        supporter &&
        Date.parse(supporter.lastPaidAt) > Date.parse(row.last_active_at)
          ? supporter.lastPaidAt
          : row.last_active_at,
    });
    supporterTotals.delete(row.user_id);
  }

  for (const [userId, supporter] of supporterTotals) {
    if (supporter.hkd <= 0) continue;

    combined.set(userId, {
      user_id: userId,
      total_online_time: 0,
      total_play_time: 0,
      total_donated: supporter.hkd,
      last_active_at: supporter.lastPaidAt,
    });
  }

  return [...combined.values()]
    .sort((a, b) => {
      if (b.total_donated !== a.total_donated) {
        return b.total_donated - a.total_donated;
      }
      return Date.parse(b.last_active_at) - Date.parse(a.last_active_at);
    })
    .slice(0, LEADERBOARD_LIMIT);
}

/** 單一用戶貢獻累計（HKD）：打賞 + 支持者付款 */
export async function getUserContributionHkd(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const [{ data: activity, error: activityError }, supporterTotals] =
    await Promise.all([
      supabase
        .from("user_activity_stats")
        .select("total_donated")
        .eq("user_id", userId)
        .maybeSingle(),
      fetchSupporterPassTotals(supabase, new Set()),
    ]);

  if (activityError) {
    throw new Error(`讀取用戶貢獻資料失敗：${activityError.message}`);
  }

  const tipsHkd = Number(activity?.total_donated ?? 0);
  const supporterHkd = supporterTotals.get(userId)?.hkd ?? 0;
  return tipsHkd + supporterHkd;
}

function mapEntries(
  rows: ActivityStatsRow[],
  profiles: Map<string, ProfileRow>,
  titleMap: Map<string, import("@/lib/titles").EquippedTitle | null>,
  valueKey: "total_online_time" | "total_play_time" | "total_donated",
  currentUserId?: string | null,
  viewerIsAdmin = false
): PlatformLeaderboardEntry[] {
  const now = Date.now();

  return rows.map((row, index) => {
    const profile = profiles.get(row.user_id);
    const isMe = currentUserId ? row.user_id === currentUserId : false;
    let value =
      valueKey === "total_donated"
        ? Number(row.total_donated)
        : row[valueKey];

    let isDonationMasked: boolean | undefined;
    let donationTier: import("@/lib/platform-leaderboard").DonationPrivacyTier | undefined;

    if (valueKey === "total_donated") {
      const rawHkd = Number(row.total_donated);
      const masked = maskDonationAmount(rawHkd, {
        isSelf: isMe,
        isAdmin: viewerIsAdmin,
      });
      value = hkdToUsd(masked.value);
      isDonationMasked = masked.isMasked;
      donationTier = masked.tier;
    }

    return {
      rank: index + 1,
      userId: row.user_id,
      displayName: profile?.display_name?.trim() || "匿名玩家",
      avatarUrl: profile?.avatar_url ?? null,
      equippedTitle: titleMap.get(row.user_id) ?? null,
      value,
      lastActiveAt: row.last_active_at,
      isOnline: isUserOnline(row.last_active_at, now),
      isMe: currentUserId ? isMe : undefined,
      isDonationMasked,
      donationTier,
    };
  });
}

async function loadProfiles(
  supabase: SupabaseClient,
  userIds: string[]
): Promise<Map<string, ProfileRow>> {
  if (userIds.length === 0) return new Map();

  const uniqueIds = [...new Set(userIds)];
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url")
    .in("id", uniqueIds);

  if (error) {
    throw new Error(`讀取玩家資料失敗：${error.message}`);
  }

  return new Map(
    ((data ?? []) as ProfileRow[]).map((profile) => [profile.id, profile])
  );
}

export async function getPlatformLeaderboards(
  supabase: SupabaseClient,
  currentUserId?: string | null,
  viewerIsAdmin = false
): Promise<PlatformLeaderboardsResponse> {
  await ensureActivityStatsBackfill(supabase);

  const ambientBotIds = await listAmbientBotUserIds(supabase);

  const [onlineRows, playRows, donatedRows] = await Promise.all([
    fetchTopByColumn(supabase, "total_online_time", ambientBotIds),
    fetchTopByColumn(supabase, "total_play_time", ambientBotIds),
    fetchTopContributionRows(supabase, ambientBotIds),
  ]);

  const userIds = [
    ...onlineRows.map((row) => row.user_id),
    ...playRows.map((row) => row.user_id),
    ...donatedRows.map((row) => row.user_id),
  ];

  const profiles = await loadProfiles(supabase, userIds);
  const titleMap = await resolveEquippedTitles(supabase, userIds);
  const virtual = getVirtualPlatformLeaderboardEntries(currentUserId);

  const realOnline = mapEntries(
    onlineRows,
    profiles,
    titleMap,
    "total_online_time",
    currentUserId,
    viewerIsAdmin
  );
  const realPlayTime = mapEntries(
    playRows,
    profiles,
    titleMap,
    "total_play_time",
    currentUserId,
    viewerIsAdmin
  );
  const realDonated = mapEntries(
    donatedRows,
    profiles,
    titleMap,
    "total_donated",
    currentUserId,
    viewerIsAdmin
  );

  return {
    online: mergePlatformLeaderboardEntries(
      realOnline,
      virtual.online,
      currentUserId
    ),
    playTime: mergePlatformLeaderboardEntries(
      realPlayTime,
      virtual.playTime,
      currentUserId
    ),
    donated: mergePlatformLeaderboardEntries(
      realDonated,
      virtual.donated,
      currentUserId
    ),
    fetchedAt: new Date().toISOString(),
  };
}

export async function pulseUserActivity(
  supabase: SupabaseClient,
  onlineSeconds: number,
  playSeconds: number
): Promise<void> {
  const { error } = await supabase.rpc("pulse_user_activity", {
    p_online_seconds: onlineSeconds,
    p_play_seconds: playSeconds,
  });

  if (error) {
    throw new Error(`更新活躍度失敗：${error.message}`);
  }
}

export async function recordUserDonation(
  supabase: SupabaseClient,
  userId: string,
  amount: number
): Promise<void> {
  const { error } = await supabase.rpc("record_user_donation", {
    p_user_id: userId,
    p_amount: amount,
  });

  if (error) {
    throw new Error(`記錄打賞失敗：${error.message}`);
  }
}
