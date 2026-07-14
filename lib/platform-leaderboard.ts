export const ONLINE_THRESHOLD_MS = 5 * 60 * 1000;
export const LEADERBOARD_POLL_MS = 10_000;
export const ACTIVITY_PULSE_MS = 30_000;
export const ACTIVITY_PULSE_SECONDS = 30;
export const LEADERBOARD_TOP_LIMIT = 50;
export const LEADERBOARD_PAGE_SIZE = 10;
/** 打賞金額在資料庫以 HKD 累計；對外顯示 USD 時使用此匯率 */
export const TIP_USD_TO_HKD = 7.8;

export function hkdToUsd(amountHkd: number): number {
  if (!Number.isFinite(amountHkd) || amountHkd <= 0) return 0;
  return Math.round((amountHkd / TIP_USD_TO_HKD) * 100) / 100;
}

export function usdToHkd(amountUsd: number): number {
  if (!Number.isFinite(amountUsd) || amountUsd <= 0) return 0;
  return Math.round(amountUsd * TIP_USD_TO_HKD * 100) / 100;
}

export function usdCentsToHkd(cents: number): number {
  if (!Number.isFinite(cents) || cents <= 0) return 0;
  return usdToHkd(cents / 100);
}

export type ActivityStatsRow = {
  user_id: string;
  total_online_time: number;
  total_play_time: number;
  total_donated: number;
  night_online_time?: number;
  last_active_at: string;
};

export type DonationPrivacyTier =
  | "none"
  | "supporter"
  | "enthusiast"
  | "patron"
  | "legend";

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
  /** 打賞榜：非本人且非 admin 時為 true，UI 顯示區間而非精確金額 */
  isDonationMasked?: boolean;
  donationTier?: DonationPrivacyTier;
  isSupporter?: boolean;
  supporterBadge?: string | null;
  /** 真實用戶管理員角色：排行榜顯示「超級管理員」／「管理員」稱號 */
  adminRole?: import("@/lib/admin-display-role").AdminDisplayRole;
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

export function formatDonationAmount(amountUsd: number, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amountUsd);
  } catch {
    return `$${amountUsd.toFixed(2)}`;
  }
}

export function formatDonationAmountFromHkd(
  amountHkd: number,
  locale: string
): string {
  return formatDonationAmount(hkdToUsd(amountHkd), locale);
}

const DONATION_TIER_LABELS: Record<
  DonationPrivacyTier,
  { "zh-HK": string; en: string; default: string }
> = {
  none: { "zh-HK": "—", en: "—", default: "—" },
  supporter: { "zh-HK": "☕ 支持者", en: "☕ Supporter", default: "☕ Supporter" },
  enthusiast: {
    "zh-HK": "⭐ 熱心支持者",
    en: "⭐ Enthusiast",
    default: "⭐ Enthusiast",
  },
  patron: { "zh-HK": "💎 金牌贊助", en: "💎 Patron", default: "💎 Patron" },
  legend: { "zh-HK": "👑 傳奇贊助", en: "👑 Legend", default: "👑 Legend" },
};

export function formatDonationTierLabel(
  tier: DonationPrivacyTier,
  locale: string
): string {
  const labels = DONATION_TIER_LABELS[tier];
  if (locale.startsWith("zh")) {
    return labels["zh-HK"];
  }
  if (locale.startsWith("en")) {
    return labels.en;
  }
  return labels.default;
}
