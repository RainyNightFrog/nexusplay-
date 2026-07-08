import { isUserOnline, LEADERBOARD_TOP_LIMIT, type PlatformLeaderboardEntry } from "@/lib/platform-leaderboard";
import { getVirtualPlayerAvatarUrl } from "@/lib/virtual-player-avatar";
import {
  getVirtualPlayerById,
  type VirtualPlayer,
} from "@/lib/virtual-players";

export const VIRTUAL_LEADERBOARD_USER_PREFIX = "virtual-player:";

/** 排行榜虛擬玩家池：24 人（45% 簡體 · 40% 英文 · 15% 繁體粵語） */
export const LEADERBOARD_VIRTUAL_PLAYER_IDS = [
  "hk-01",
  "hk-06",
  "hk-12",
  "cn-01",
  "cn-02",
  "cn-03",
  "cn-04",
  "cn-05",
  "cn-06",
  "cn-07",
  "cn-08",
  "cn-09",
  "cn-10",
  "cn-11",
  "en-01",
  "en-02",
  "en-03",
  "en-04",
  "en-05",
  "en-06",
  "en-07",
  "en-08",
  "en-09",
  "en-10",
] as const;

export const LEADERBOARD_VIRTUAL_COUNT = LEADERBOARD_VIRTUAL_PLAYER_IDS.length;

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

const THREE_HOURS_SECONDS = 3 * 3600;
const THREE_DAYS_SECONDS = 3 * 24 * 3600;

/** 虛擬玩家時長起算點（香港時間） */
const VIRTUAL_LEADERBOARD_EPOCH_MS = Date.parse("2026-03-01T00:00:00+08:00");

/** 相對真實時間的累加速度：約 1/3（每 3 秒真實時間 +1 秒虛擬在線） */
const VIRTUAL_TIME_GROWTH_RATIO = 1 / 3;

function scaleHashToRange(hash: number, min: number, max: number) {
  const span = max - min;
  return min + (hash % (span + 1));
}

/** 每位玩家獨立上限（秒），分散在約 5h–72h，避免整批卡在 72 小時 */
function getPlayerOnlineCeilingSeconds(h1: number, h2: number, h4: number) {
  if (h4 % 11 === 0) {
    return THREE_DAYS_SECONDS - (h2 % 5) * 600;
  }

  const minSeconds = 5 * 3600;
  const maxSeconds = THREE_DAYS_SECONDS - 3 * 3600;
  const span = maxSeconds - minSeconds;
  const raw = (Math.imul(h1, 2654435761) ^ Math.imul(h2, 1597334677) ^ h4) >>> 0;
  return minSeconds + (raw % (span + 1));
}

function getLeaderboardVirtualPlayers(): VirtualPlayer[] {
  return LEADERBOARD_VIRTUAL_PLAYER_IDS.map((id) => getVirtualPlayerById(id)).filter(
    (player): player is VirtualPlayer => Boolean(player)
  );
}

type VirtualActivitySnapshot = {
  onlineSeconds: number;
  playSeconds: number;
  lastActiveAt: string;
};

/**
 * 模擬真人上線節奏：上線累加 → 下線休息（時長凍結）→ 再上線。
 * 休息中的玩家時長停止，其他玩家可反超；累加速度約為真實時間的 1/3。
 */
function computeVirtualActivity(
  player: VirtualPlayer,
  now: number
): VirtualActivitySnapshot {
  const h1 = hashString(player.id, 17);
  const h2 = hashString(player.id, 53);
  const h3 = hashString(player.id, 91);
  const h4 = hashString(player.id, 127);
  const h5 = hashString(player.id, 163);

  const playerCeilingSeconds = getPlayerOnlineCeilingSeconds(h1, h2, h4);
  const baseOnlineSeconds = scaleHashToRange(
    h5,
    THREE_HOURS_SECONDS,
    Math.max(
      THREE_HOURS_SECONDS,
      Math.floor(playerCeilingSeconds * (0.28 + (h3 % 23) / 100))
    )
  );
  const playRatioPercent = 40 + (h2 % 41);

  const startOffsetMs = (h3 % (48 * 3600)) * 1000;
  const playerStartMs = VIRTUAL_LEADERBOARD_EPOCH_MS + startOffsetMs;

  if (now <= playerStartMs) {
    const playSeconds = Math.max(
      1,
      Math.floor((baseOnlineSeconds * playRatioPercent) / 100)
    );
    return {
      onlineSeconds: baseOnlineSeconds,
      playSeconds: Math.min(baseOnlineSeconds, playSeconds),
      lastActiveAt: new Date(now - (12 + (h2 % 48)) * 60_000).toISOString(),
    };
  }

  const elapsedMs = now - playerStartMs;

  const sessionMs = (90 + (h1 % 271)) * 60_000;
  const breakMs = (15 + (h2 % 226)) * 60_000 * (h4 % 9 === 0 ? 1.45 : 1);
  const cycleMs = sessionMs + breakMs;
  const cycleOffsetMs = h4 % cycleMs;

  const timelineMs = elapsedMs + cycleOffsetMs;
  const fullCycles = Math.floor(timelineMs / cycleMs);
  const cyclePositionMs = timelineMs % cycleMs;
  const isInSession = cyclePositionMs < sessionMs;

  const activeMsThisCycle = isInSession ? cyclePositionMs : sessionMs;
  const totalActiveMs = fullCycles * sessionMs + activeMsThisCycle;

  const growthMultiplier =
    VIRTUAL_TIME_GROWTH_RATIO * (0.88 + (h2 % 25) / 100);
  const grownSeconds = Math.floor((totalActiveMs / 1000) * growthMultiplier);

  const onlineSeconds = Math.min(
    playerCeilingSeconds,
    baseOnlineSeconds + grownSeconds
  );
  const playSeconds = Math.max(
    1,
    Math.min(
      onlineSeconds,
      Math.floor((onlineSeconds * playRatioPercent) / 100)
    )
  );

  let lastActiveAt: string;
  if (isInSession) {
    const minutesAgo = 1 + Math.floor((cyclePositionMs / sessionMs) * 6) + (h1 % 3);
    lastActiveAt = new Date(now - minutesAgo * 60_000).toISOString();
  } else {
    const breakElapsedMs = cyclePositionMs - sessionMs;
    const minutesSinceOffline =
      Math.floor(breakElapsedMs / 60_000) + 8 + (h3 % 36);
    lastActiveAt = new Date(now - minutesSinceOffline * 60_000).toISOString();
  }

  return { onlineSeconds, playSeconds, lastActiveAt };
}

/** 供聊天玩家卡片等使用的虛擬玩家活躍數據 */
export function getVirtualPlayerActivityStats(
  playerId: string,
  now = Date.now()
) {
  const player = getVirtualPlayerById(playerId);
  if (!player) return null;

  const activity = computeVirtualActivity(player, now);
  return {
    playerId: player.id,
    displayName: player.displayName,
    locale: player.locale,
    ...activity,
    isOnline: isUserOnline(activity.lastActiveAt, now),
  };
}

function buildVirtualStats(now = Date.now()): VirtualStats[] {
  return getLeaderboardVirtualPlayers().map((player) => {
    const activity = computeVirtualActivity(player, now);
    return {
      playerId: player.id,
      displayName: player.displayName,
      ...activity,
    };
  });
}

function toEntries(
  rows: VirtualStats[],
  valueKey: "onlineSeconds" | "playSeconds",
  now: number,
  currentUserId?: string | null
): PlatformLeaderboardEntry[] {
  return [...rows]
    .sort((a, b) => b[valueKey] - a[valueKey])
    .map((row, index) => ({
      rank: index + 1,
      userId: `${VIRTUAL_LEADERBOARD_USER_PREFIX}${row.playerId}`,
      displayName: row.displayName,
      avatarUrl: getVirtualPlayerAvatarUrl(row.playerId),
      equippedTitle: null,
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

/**
 * 合併排行榜：真實玩家全部保留（數據不變），虛擬玩家僅填補剩餘名額。
 */
export function mergePlatformLeaderboardEntries(
  real: PlatformLeaderboardEntry[],
  virtual: PlatformLeaderboardEntry[],
  currentUserId?: string | null,
  limit = LEADERBOARD_TOP_LIMIT
): PlatformLeaderboardEntry[] {
  const realIds = new Set(real.map((entry) => entry.userId));
  const virtualPool = virtual.filter((entry) => !realIds.has(entry.userId));

  const slotsForVirtual = Math.max(0, limit - real.length);
  const virtualPicks = virtualPool.slice(0, slotsForVirtual);

  const combined = [...real, ...virtualPicks].sort((a, b) => b.value - a.value);

  return combined.slice(0, limit).map((entry, index) => ({
    ...entry,
    rank: index + 1,
    isMe: currentUserId ? entry.userId === currentUserId : undefined,
  }));
}
