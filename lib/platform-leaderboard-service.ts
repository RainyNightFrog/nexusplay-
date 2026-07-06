import type { SupabaseClient } from "@supabase/supabase-js";
import {
  isUserOnline,
  type ActivityStatsRow,
  type PlatformLeaderboardEntry,
  type PlatformLeaderboardsResponse,
} from "@/lib/platform-leaderboard";

type ProfileRow = {
  id: string;
  display_name: string;
  avatar_url: string | null;
};

const LEADERBOARD_LIMIT = 10;

async function ensureActivityStatsBackfill(
  supabase: SupabaseClient
): Promise<void> {
  const { error } = await supabase.rpc("backfill_user_activity_stats");
  if (error) {
    throw new Error(`補建排行榜資料失敗：${error.message}`);
  }
}

async function fetchTopByColumn(
  supabase: SupabaseClient,
  column: "total_online_time" | "total_play_time" | "total_donated"
): Promise<ActivityStatsRow[]> {
  const { data, error } = await supabase
    .from("user_activity_stats")
    .select(
      "user_id, total_online_time, total_play_time, total_donated, last_active_at"
    )
    .order(column, { ascending: false })
    .order("last_active_at", { ascending: false })
    .limit(LEADERBOARD_LIMIT);

  if (error) {
    throw new Error(`讀取排行榜失敗：${error.message}`);
  }

  return (data ?? []) as ActivityStatsRow[];
}

function mapEntries(
  rows: ActivityStatsRow[],
  profiles: Map<string, ProfileRow>,
  valueKey: "total_online_time" | "total_play_time" | "total_donated",
  currentUserId?: string | null
): PlatformLeaderboardEntry[] {
  const now = Date.now();

  return rows.map((row, index) => {
    const profile = profiles.get(row.user_id);
    const value =
      valueKey === "total_donated"
        ? Number(row.total_donated)
        : row[valueKey];

    return {
      rank: index + 1,
      userId: row.user_id,
      displayName: profile?.display_name?.trim() || "匿名玩家",
      avatarUrl: profile?.avatar_url ?? null,
      value,
      lastActiveAt: row.last_active_at,
      isOnline: isUserOnline(row.last_active_at, now),
      isMe: currentUserId ? row.user_id === currentUserId : undefined,
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
  currentUserId?: string | null
): Promise<PlatformLeaderboardsResponse> {
  await ensureActivityStatsBackfill(supabase);

  const [onlineRows, playRows, donatedRows] = await Promise.all([
    fetchTopByColumn(supabase, "total_online_time"),
    fetchTopByColumn(supabase, "total_play_time"),
    fetchTopByColumn(supabase, "total_donated"),
  ]);

  const userIds = [
    ...onlineRows.map((row) => row.user_id),
    ...playRows.map((row) => row.user_id),
    ...donatedRows.map((row) => row.user_id),
  ];

  const profiles = await loadProfiles(supabase, userIds);

  return {
    online: mapEntries(onlineRows, profiles, "total_online_time", currentUserId),
    playTime: mapEntries(playRows, profiles, "total_play_time", currentUserId),
    donated: mapEntries(donatedRows, profiles, "total_donated", currentUserId),
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
