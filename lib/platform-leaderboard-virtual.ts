import {
  isUserOnline,
  type PlatformLeaderboardEntry,
} from "@/lib/platform-leaderboard";
import { resolveVirtualPlayerAvatarUrl } from "@/lib/virtual-player-avatar";
import {
  getVirtualPlayerEquippedTitle,
  getVirtualPlayerSupporterFlags,
} from "@/lib/virtual-player-supporter";
import {
  VIRTUAL_PLAYERS,
  getVirtualPlayerById,
  type VirtualPlayer,
} from "@/lib/virtual-players";

function virtualPlayerPresentation(playerId: string) {
  const supporter = getVirtualPlayerSupporterFlags(playerId);
  return {
    equippedTitle: getVirtualPlayerEquippedTitle(playerId),
    isSupporter: supporter?.isSupporter === true,
    supporterBadge: supporter?.badge ?? null,
  };
}

export const VIRTUAL_LEADERBOARD_USER_PREFIX = "virtual-player:";

/** 排行榜使用全部虛擬玩家 */
export const LEADERBOARD_VIRTUAL_PLAYER_IDS = VIRTUAL_PLAYERS.map(
  (player) => player.id
);

export const LEADERBOARD_VIRTUAL_COUNT = VIRTUAL_PLAYERS.length;

/** 貢獻榜虛擬玩家數量 */
export const LEADERBOARD_VIRTUAL_DONATION_COUNT = 20;

const VIRTUAL_DONATION_MIN_USD = 1;
const VIRTUAL_DONATION_MAX_USD = 160;

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

const TWO_HOURS_SECONDS = 2 * 3600;
const EIGHT_HOURS_SECONDS = 8 * 3600;
const MAX_CEILING_SECONDS = 56 * 3600;
const MIN_CEILING_SECONDS = 6 * 3600;

/** 虛擬玩家時長起算點（香港時間） */
const VIRTUAL_LEADERBOARD_EPOCH_MS = Date.parse("2026-03-01T00:00:00+08:00");

/** 相對真實時間的累加速度：約 1/3（每 3 秒真實時間 +1 秒虛擬在線） */
const VIRTUAL_TIME_GROWTH_RATIO = 1 / 3;

function getLeaderboardVirtualPlayers(): VirtualPlayer[] {
  return VIRTUAL_PLAYERS;
}

type VirtualActivitySnapshot = {
  onlineSeconds: number;
  playSeconds: number;
  lastActiveAt: string;
};

/** 依玩家 ID 在池中的百分位，讓時長分布更平均、差距像真人 */
function getPlayerTier(playerId: string, totalPlayers: number) {
  const h1 = hashString(playerId, 17);
  const h2 = hashString(playerId, 53);
  return (h1 + h2 * 7) % totalPlayers;
}

function getPlayerCeilingSeconds(playerId: string, totalPlayers: number) {
  const tier = getPlayerTier(playerId, totalPlayers);
  const jitter = hashString(playerId, 127) % 1800;
  const span = MAX_CEILING_SECONDS - MIN_CEILING_SECONDS;
  const base = MIN_CEILING_SECONDS + Math.floor((tier / Math.max(totalPlayers - 1, 1)) * span);
  return Math.min(MAX_CEILING_SECONDS, base + jitter - 900);
}

function getPlayerBaseOnlineSeconds(
  playerId: string,
  ceilingSeconds: number,
  h3: number,
  h5: number
) {
  const startFraction = 0.18 + (h3 % 27) / 100;
  const fromCeiling = Math.floor(ceilingSeconds * startFraction);
  const floor = TWO_HOURS_SECONDS + (h5 % (EIGHT_HOURS_SECONDS - TWO_HOURS_SECONDS));
  return Math.min(ceilingSeconds - 3600, Math.max(floor, fromCeiling));
}

/**
 * 模擬真人上線節奏：上線累加 → 下線休息（時長凍結）→ 再上線。
 * 休息中的玩家時長停止，其他玩家可反超；累加速度約為真實時間的 1/3。
 */
function computeVirtualActivity(
  player: VirtualPlayer,
  now: number,
  totalPlayers: number
): VirtualActivitySnapshot {
  const h1 = hashString(player.id, 17);
  const h2 = hashString(player.id, 53);
  const h3 = hashString(player.id, 91);
  const h4 = hashString(player.id, 127);
  const h5 = hashString(player.id, 163);

  const playerCeilingSeconds = getPlayerCeilingSeconds(player.id, totalPlayers);
  const baseOnlineSeconds = getPlayerBaseOnlineSeconds(
    player.id,
    playerCeilingSeconds,
    h3,
    h5
  );
  const playRatioPercent = 36 + (h2 % 39);

  const startOffsetMs = (h3 % (72 * 3600)) * 1000;
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

  const sessionMs = (75 + (h1 % 285)) * 60_000;
  const breakMs = (20 + (h2 % 240)) * 60_000 * (h4 % 11 === 0 ? 1.35 : 1);
  const cycleMs = sessionMs + breakMs;
  const cycleOffsetMs = h4 % cycleMs;

  const timelineMs = elapsedMs + cycleOffsetMs;
  const fullCycles = Math.floor(timelineMs / cycleMs);
  const cyclePositionMs = timelineMs % cycleMs;
  const isInSession = cyclePositionMs < sessionMs;

  const activeMsThisCycle = isInSession ? cyclePositionMs : sessionMs;
  const totalActiveMs = fullCycles * sessionMs + activeMsThisCycle;

  const growthMultiplier =
    VIRTUAL_TIME_GROWTH_RATIO * (0.82 + (h2 % 31) / 100);
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
    const minutesAgo = 1 + Math.floor((cyclePositionMs / sessionMs) * 8) + (h1 % 4);
    lastActiveAt = new Date(now - minutesAgo * 60_000).toISOString();
  } else {
    const breakElapsedMs = cyclePositionMs - sessionMs;
    const minutesSinceOffline =
      Math.floor(breakElapsedMs / 60_000) + 10 + (h3 % 42);
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

  const activity = computeVirtualActivity(player, now, LEADERBOARD_VIRTUAL_COUNT);
  return {
    playerId: player.id,
    displayName: player.displayName,
    locale: player.locale,
    ...activity,
    isOnline: isUserOnline(activity.lastActiveAt, now),
  };
}

function buildVirtualStats(now = Date.now()): VirtualStats[] {
  const players = getLeaderboardVirtualPlayers();
  return players.map((player) => {
    const activity = computeVirtualActivity(player, now, players.length);
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
    .sort((a, b) => {
      if (b[valueKey] !== a[valueKey]) return b[valueKey] - a[valueKey];
      return Date.parse(b.lastActiveAt) - Date.parse(a.lastActiveAt);
    })
    .map((row, index) => {
      const presentation = virtualPlayerPresentation(row.playerId);
      return {
        rank: index + 1,
        userId: `${VIRTUAL_LEADERBOARD_USER_PREFIX}${row.playerId}`,
        displayName: row.displayName,
        avatarUrl: resolveVirtualPlayerAvatarUrl(row.playerId),
        equippedTitle: presentation.equippedTitle,
        value: row[valueKey],
        lastActiveAt: row.lastActiveAt,
        isOnline: isUserOnline(row.lastActiveAt, now),
        isMe: currentUserId
          ? `${VIRTUAL_LEADERBOARD_USER_PREFIX}${row.playerId}` === currentUserId
          : undefined,
        isSupporter: presentation.isSupporter,
        supporterBadge: presentation.supporterBadge,
      };
    });
}

function getDonationVirtualPlayers(): VirtualPlayer[] {
  const players = getLeaderboardVirtualPlayers();
  return [...players]
    .sort((a, b) => hashString(a.id, 389) - hashString(b.id, 389))
    .slice(0, LEADERBOARD_VIRTUAL_DONATION_COUNT);
}

function getVirtualDonationUsd(playerId: string): number {
  const span = VIRTUAL_DONATION_MAX_USD - VIRTUAL_DONATION_MIN_USD + 1;
  const dollars = VIRTUAL_DONATION_MIN_USD + (hashString(playerId, 241) % span);
  const cents = hashString(playerId, 313) % 100;
  return Math.round((dollars + cents / 100) * 100) / 100;
}

function toDonationEntries(
  players: VirtualPlayer[],
  now: number,
  currentUserId?: string | null
): PlatformLeaderboardEntry[] {
  return players
    .map((player) => {
      const activity = computeVirtualActivity(
        player,
        now,
        LEADERBOARD_VIRTUAL_COUNT
      );
      const amountUsd = getVirtualDonationUsd(player.id);

      const presentation = virtualPlayerPresentation(player.id);
      return {
        rank: 0,
        userId: `${VIRTUAL_LEADERBOARD_USER_PREFIX}${player.id}`,
        displayName: player.displayName,
        avatarUrl: resolveVirtualPlayerAvatarUrl(player.id),
        equippedTitle: presentation.equippedTitle,
        value: amountUsd,
        lastActiveAt: activity.lastActiveAt,
        isOnline: isUserOnline(activity.lastActiveAt, now),
        isDonationMasked: false,
        isSupporter: presentation.isSupporter,
        supporterBadge: presentation.supporterBadge,
      };
    })
    .sort((a, b) => {
      if (b.value !== a.value) return b.value - a.value;
      return Date.parse(b.lastActiveAt) - Date.parse(a.lastActiveAt);
    })
    .map((entry, index) => ({
      ...entry,
      rank: index + 1,
      isMe: currentUserId
        ? entry.userId === currentUserId
        : undefined,
    }));
}

export function getVirtualPlatformLeaderboardEntries(
  currentUserId?: string | null
) {
  const now = Date.now();
  const stats = buildVirtualStats(now);
  const donationPlayers = getDonationVirtualPlayers();

  return {
    online: toEntries(stats, "onlineSeconds", now, currentUserId),
    playTime: toEntries(stats, "playSeconds", now, currentUserId),
    donated: toDonationEntries(donationPlayers, now, currentUserId),
  };
}

export function isVirtualLeaderboardUserId(userId: string) {
  return userId.startsWith(VIRTUAL_LEADERBOARD_USER_PREFIX);
}

/**
 * 合併排行榜：真實玩家全部保留，虛擬玩家全部加入，依時長重排。
 */
export function mergePlatformLeaderboardEntries(
  real: PlatformLeaderboardEntry[],
  virtual: PlatformLeaderboardEntry[],
  currentUserId?: string | null
): PlatformLeaderboardEntry[] {
  const realIds = new Set(real.map((entry) => entry.userId));
  const virtualPool = virtual.filter((entry) => !realIds.has(entry.userId));

  const combined = [...real, ...virtualPool].sort((a, b) => {
    if (b.value !== a.value) return b.value - a.value;
    return Date.parse(b.lastActiveAt) - Date.parse(a.lastActiveAt);
  });

  return combined.map((entry, index) => ({
    ...entry,
    rank: index + 1,
    isMe: currentUserId ? entry.userId === currentUserId : undefined,
  }));
}
