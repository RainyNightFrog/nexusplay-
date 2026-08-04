import { canonicalizeDifficulty } from "@/lib/game-leaderboard";
import type { LeaderboardPublicEntry } from "@/lib/game-leaderboard";

/** 同一 serverless instance 內短 TTL，對齊全站榜約 20s */
export const GAME_LEADERBOARD_CACHE_TTL_MS = 25_000;

type CachePayload = {
  expiresAt: number;
  /** 匿名視角 entries；_uid 僅供 remap isMe，回傳前會剝除 */
  entries: Array<LeaderboardPublicEntry & { _uid?: string }>;
};

const cache = new Map<string, CachePayload>();

export function gameLeaderboardCacheKey(
  gameId: number,
  difficulty: string | null | undefined,
  limit: number,
  withTitles: boolean
): string {
  const diff = difficulty
    ? canonicalizeDifficulty(difficulty)
    : "all";
  return `${gameId}|${diff}|${limit}|t${withTitles ? 1 : 0}`;
}

export function readGameLeaderboardCache(
  key: string
): CachePayload["entries"] | null {
  const hit = cache.get(key);
  if (!hit) return null;
  if (hit.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }
  return hit.entries;
}

export function writeGameLeaderboardCache(
  key: string,
  entries: CachePayload["entries"]
): void {
  cache.set(key, {
    expiresAt: Date.now() + GAME_LEADERBOARD_CACHE_TTL_MS,
    entries,
  });
  // 防止異常成長：超過 200 筆時清掉過期
  if (cache.size > 200) {
    const now = Date.now();
    for (const [k, v] of cache) {
      if (v.expiresAt <= now) cache.delete(k);
    }
  }
}

/** 交分後清掉該遊戲所有難度／limit 快取 */
export function invalidateGameLeaderboardCache(gameId: number): void {
  const prefix = `${gameId}|`;
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}

export function attachIsMeAndStripUid(
  entries: CachePayload["entries"],
  currentUserId?: string | null
): LeaderboardPublicEntry[] {
  return entries.map(({ _uid, ...rest }) => ({
    ...rest,
    isMe: Boolean(currentUserId && _uid && _uid === currentUserId),
  }));
}
