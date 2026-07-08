export const ONLINE_THRESHOLD_MS = 5 * 60 * 1000;
export const LEADERBOARD_POLL_MS = 10_000;
export const ACTIVITY_PULSE_MS = 30_000;
export const ACTIVITY_PULSE_SECONDS = 30;
export const LEADERBOARD_TOP_LIMIT = 50;
export const LEADERBOARD_PAGE_SIZE = 10;

export type ActivityStatsRow = {
  user_id: string;
  total_online_time: number;
  total_play_time: number;
  total_donated: number;
  night_online_time?: number;
  last_active_at: string;
};

export type PlatformLeaderboardEntry = {
  rank: number;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  equippedTitle: import("@/lib/titles").EquippedTitle | null;
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

export type DurationFormatter = (
  key: "durationHoursMinutes" | "durationHoursOnly",
  values: { hours: number; minutes: number }
) => string;

export function formatDurationSeconds(
  seconds: number,
  format: DurationFormatter
): string {
  const hours = Math.max(0, Math.floor(seconds / 3600));
  const minutes = Math.floor((seconds % 3600) / 60);

  if (minutes > 0) {
    return format("durationHoursMinutes", { hours, minutes });
  }

  return format("durationHoursOnly", { hours, minutes });
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
