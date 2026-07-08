import { isUserOnline, type PlatformLeaderboardEntry } from "@/lib/platform-leaderboard";
import { getVirtualPlayerAvatarUrl } from "@/lib/virtual-player-avatar";
import { VIRTUAL_PLAYERS } from "@/lib/virtual-players";

export const VIRTUAL_LEADERBOARD_USER_PREFIX = "virtual-player:";

type VirtualStats = {
  playerId: string;
  displayName: string;
  onlineSeconds: number;
  playSeconds: number;
  lastActiveAt: string;
};

function hashString(value: string, salt: number) {
  let hash = salt;
  for (const char of value) {
    hash = Math.imul(31, hash) + char.charCodeAt(0);
    hash |= 0;
  }
  return Math.abs(hash);
}

const SIX_HOURS_SECONDS = 6 * 3600;
const TWO_DAYS_SECONDS = 2 * 24 * 3600;
const FIVE_DAYS_SECONDS = 5 * 24 * 3600;

function scaleHashToRange(hash: number, min: number, max: number) {
  const span = max - min;
  return min + (hash % (span + 1));
}

/** 依玩家 id 產生穩定活躍數據（在線 6 小時–5 天、遊玩 6 小時–2 天，且不超過在線） */
function buildVirtualStats(now = Date.now()): VirtualStats[] {
  return VIRTUAL_PLAYERS.map((player) => {
    const h1 = hashString(player.id, 17);
    const h2 = hashString(player.id, 53);
    const onlineSeconds = scaleHashToRange(
      h1,
      SIX_HOURS_SECONDS,
      FIVE_DAYS_SECONDS
    );
    const playMax = Math.min(TWO_DAYS_SECONDS, onlineSeconds);
    const playMin = Math.min(SIX_HOURS_SECONDS, playMax);
    const playSeconds = scaleHashToRange(h2, playMin, playMax);
    const minutesAgo = h1 % 180;
    const lastActiveAt = new Date(now - minutesAgo * 60_000).toISOString();

    return {
      playerId: player.id,
      displayName: player.displayName,
      onlineSeconds,
      playSeconds,
      lastActiveAt,
    };
  });
}

function toEntries(
  rows: VirtualStats[],
  valueKey: "onlineSeconds" | "playSeconds",
  now: number,
  currentUserId?: string | null
): PlatformLeaderboardEntry[] {
  const sorted = [...rows]
    .sort((a, b) => b[valueKey] - a[valueKey])
    .slice(0, 10);

  return sorted.map((row, index) => ({
    rank: index + 1,
    userId: `${VIRTUAL_LEADERBOARD_USER_PREFIX}${row.playerId}`,
    displayName: row.displayName,
    avatarUrl: getVirtualPlayerAvatarUrl(row.playerId),
    value: row[valueKey],
    lastActiveAt: row.lastActiveAt,
    isOnline: isUserOnline(row.lastActiveAt, now),
    isMe: currentUserId
      ? `${VIRTUAL_LEADERBOARD_USER_PREFIX}${row.playerId}` === currentUserId
      : undefined,
  }));
}

export function getVirtualPlatformLeaderboardEntries(
  currentUserId?: string | null
) {
  const now = Date.now();
  const stats = buildVirtualStats(now);

  return {
    online: toEntries(stats, "onlineSeconds", now, currentUserId),
    playTime: toEntries(stats, "playSeconds", now, currentUserId),
  };
}

export function isVirtualLeaderboardUserId(userId: string) {
  return userId.startsWith(VIRTUAL_LEADERBOARD_USER_PREFIX);
}

export function mergePlatformLeaderboardEntries(
  real: PlatformLeaderboardEntry[],
  virtual: PlatformLeaderboardEntry[],
  currentUserId?: string | null
): PlatformLeaderboardEntry[] {
  const seen = new Set(real.map((entry) => entry.userId));
  const combined = [
    ...real,
    ...virtual.filter((entry) => !seen.has(entry.userId)),
  ];

  combined.sort((a, b) => b.value - a.value);

  return combined.slice(0, 10).map((entry, index) => ({
    ...entry,
    rank: index + 1,
    isMe: currentUserId ? entry.userId === currentUserId : undefined,
  }));
}
