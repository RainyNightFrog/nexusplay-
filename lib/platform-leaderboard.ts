export const ONLINE_THRESHOLD_MS = 5 * 60 * 1000;
export const LEADERBOARD_POLL_MS = 10_000;
export const ACTIVITY_PULSE_MS = 30_000;
export const ACTIVITY_PULSE_SECONDS = 30;

export type ActivityStatsRow = {
  user_id: string;
  total_online_time: number;
  total_play_time: number;
  total_donated: number;
  last_active_at: string;
};

export type PlatformLeaderboardEntry = {
  rank: number;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  value: number;
  lastActiveAt: string;
  isOnline: boolean;
  isMe?: boolean;
};

export type PlatformLeaderboardsResponse = {
  online: PlatformLeaderboardEntry[];
  playTime: PlatformLeaderboardEntry[];
  donated: PlatformLeaderboardEntry[];
  fetchedAt: string;
};

export function isUserOnline(lastActiveAt: string, now = Date.now()): boolean {
  const ts = Date.parse(lastActiveAt);
  if (Number.isNaN(ts)) return false;
  return now - ts <= ONLINE_THRESHOLD_MS;
}

export function formatDurationSeconds(seconds: number, locale: string): string {
  const safe = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);

  if (locale.startsWith("zh")) {
    if (hours > 0) return `${hours} 小時 ${minutes} 分`;
    if (minutes > 0) return `${minutes} 分鐘`;
    return `${safe} 秒`;
  }

  if (locale === "ja") {
    if (hours > 0) return `${hours}時間${minutes}分`;
    if (minutes > 0) return `${minutes}分`;
    return `${safe}秒`;
  }

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${safe}s`;
}

export function formatDonationAmount(amount: number, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "HKD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `HK$${amount.toFixed(2)}`;
  }
}
