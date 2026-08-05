import {
  canonicalizeDifficulty,
  normalizePlayerNameKey,
  type LeaderboardPublicEntry,
} from "@/lib/game-leaderboard";
import { PLATFORM_GAMES } from "@/lib/platform-catalog";
import { getVirtualPlayerEquippedTitle } from "@/lib/virtual-player-supporter";
import { VIRTUAL_PLAYERS } from "@/lib/virtual-players";

/** 平台內建作品（街機 + demos + 旗艦）皆注入各難度排行榜人數 */
export const VIRTUAL_GAME_LEADERBOARD_SLUGS = new Set(
  PLATFORM_GAMES.map((game) => game.slug)
);

const DIFFICULTIES = ["easy", "normal", "hard"] as const;
type CanonicalDifficulty = (typeof DIFFICULTIES)[number];

type ScoreBand = {
  /** 該難度虛擬榜最低分（約末段玩家） */
  min: number;
  /** 該難度虛擬榜最高分（頂尖，仍留真實玩家可超越空間） */
  max: number;
};

/** 以 Standard（normal）為基準的合理分數帶；勿誇張 */
const BASE_SCORE_BANDS: Record<string, ScoreBand> = {
  "neon-snake-extreme": { min: 980, max: 6_400 },
  "cyber-bubble-pop": { min: 1_600, max: 8_800 },
  "quantum-tic-tac-toe": { min: 6, max: 36 },
  "void-brick-breaker": { min: 1_400, max: 9_600 },
  "rainy-frog-dash": { min: 720, max: 5_800 },
  "neon-tetromino-rush": { min: 3_200, max: 24_000 },
  "galactic-invader-2026": { min: 1_800, max: 14_500 },
  "memory-matrix-glitch": { min: 640, max: 4_200 },
  "overdrive-cyber-pong": { min: 4, max: 14 },
  "cyber-neon-runner": { min: 900, max: 7_200 },
  "cyber-blade-dash": { min: 680, max: 5_600 },
  "neon-pinball-frenzy": { min: 28_000, max: 156_000 },
  "void-rhythm-beat": { min: 42_000, max: 268_000 },
  "astro-gravity-runner": { min: 860, max: 6_800 },
  "cyber-rogue-dungeon": { min: 740, max: 8_200 },
  "core-defense": { min: 18, max: 72 },
  "cyber-fortune": { min: 420, max: 3_800 },
  "pulse-protocol": { min: 38_000, max: 246_000 },
  "neon-abyss-runner": { min: 880, max: 7_400 },
  "signal-breach": { min: 620, max: 6_200 },
  "void-relay": { min: 480, max: 4_100 },
  "orbital-salvage": { min: 920, max: 8_400 },
  "void-gacha": { min: 520, max: 5_400 },
  "neon-holdem": { min: 1_200, max: 48_000 },
};

const DEFAULT_BAND: ScoreBand = { min: 800, max: 5_200 };

/** 對齊常見分數倍率：輕鬆略低、狂暴略高但不過分 */
const DIFF_BAND_SCALE: Record<CanonicalDifficulty, { min: number; max: number }> = {
  easy: { min: 0.92, max: 0.78 },
  normal: { min: 1, max: 1 },
  hard: { min: 0.88, max: 1.22 },
};

function hashString(value: string, salt: number) {
  let hash = salt;
  for (const char of value) {
    hash = Math.imul(31, hash) + char.charCodeAt(0);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function isVirtualGameLeaderboardSlug(slug?: string | null): boolean {
  if (!slug) return false;
  return VIRTUAL_GAME_LEADERBOARD_SLUGS.has(slug);
}

function resolveBand(slug: string, difficulty: CanonicalDifficulty): ScoreBand {
  const base = BASE_SCORE_BANDS[slug] ?? DEFAULT_BAND;
  const isLowScoreGame = base.max <= 40;

  if (isLowScoreGame) {
    const shift =
      difficulty === "easy" ? { min: 0, max: -1 } : difficulty === "hard" ? { min: -1, max: 2 } : { min: 0, max: 0 };
    let min = Math.max(1, base.min + shift.min);
    let max = Math.max(min + 3, base.max + shift.max);
    return { min, max };
  }

  const scale = DIFF_BAND_SCALE[difficulty];
  let min = Math.round(base.min * scale.min);
  let max = Math.round(base.max * scale.max);
  if (max <= min) max = min + Math.max(3, Math.round(min * 0.15));
  return { min, max };
}

function pickPlayerCount(slug: string, difficulty: string): number {
  return 20 + (hashString(`${slug}:${difficulty}`, 419) % 11);
}

function gradeForRank(rankIndex: number, count: number): string | null {
  const t = rankIndex / Math.max(count - 1, 1);
  if (t <= 0.08) return "S";
  if (t <= 0.28) return "A";
  if (t <= 0.55) return "B";
  if (t <= 0.82) return "C";
  return "D";
}

function scoreForPlayer(
  slug: string,
  difficulty: CanonicalDifficulty,
  playerId: string,
  rankIndex: number,
  count: number
): number {
  const band = resolveBand(slug, difficulty);
  const t = rankIndex / Math.max(count - 1, 1);
  const span = band.max - band.min;

  if (span <= 40) {
    // 低分遊戲（乒乓／過三關等）：依名次均勻拉開，避免大量同分
    const stepped = Math.round(band.max - span * t);
    const micro = hashString(`${slug}:${difficulty}:${playerId}`, 733) % 2;
    return Math.max(band.min, Math.min(band.max, stepped - (rankIndex > 0 ? micro : 0)));
  }

  const curve = Math.pow(t, 0.7);
  const jitter = (hashString(`${slug}:${difficulty}:${playerId}`, 733) % 91) - 45;
  const raw = band.max - span * curve + jitter;
  const rounded = Math.round(raw / 5) * 5;
  return Math.max(band.min, Math.min(band.max, rounded));
}

function updatedAtForPlayer(playerId: string, slug: string, difficulty: string): string {
  const now = Date.now();
  const daysAgo = 1 + (hashString(`${slug}:${difficulty}:${playerId}`, 997) % 18);
  const hours = hashString(playerId, 271) % 20;
  const minutes = hashString(playerId, 509) % 55;
  return new Date(now - ((daysAgo * 24 + hours) * 60 + minutes) * 60_000).toISOString();
}

/**
 * 為指定內建遊戲 × 難度產生約 20～30 名玩家分數（決定性、穩定）。
 * 對外不標記為虛擬；顯示名稱與平台既有玩家池一致。
 */
export function buildVirtualGameLeaderboardEntries(
  slug: string,
  difficultyRaw?: string | null
): LeaderboardPublicEntry[] {
  if (!isVirtualGameLeaderboardSlug(slug)) return [];

  const difficulty = canonicalizeDifficulty(difficultyRaw || "normal") as CanonicalDifficulty;
  const safeDiff: CanonicalDifficulty = DIFFICULTIES.includes(difficulty)
    ? difficulty
    : "normal";

  const count = pickPlayerCount(slug, safeDiff);
  const picked = [...VIRTUAL_PLAYERS]
    .sort(
      (a, b) =>
        hashString(`${slug}:${safeDiff}:${a.id}`, 131) -
        hashString(`${slug}:${safeDiff}:${b.id}`, 131)
    )
    .slice(0, count);

  const scored = picked
    .map((player) => {
      const seedRank = hashString(`${slug}:${safeDiff}:rank:${player.id}`, 601) % 10_000;
      return { player, seedRank };
    })
    .sort((a, b) => a.seedRank - b.seedRank)
    .map(({ player }, rankIndex) => {
      const score = scoreForPlayer(slug, safeDiff, player.id, rankIndex, picked.length);
      return {
        rank: 0,
        playerName: player.displayName,
        score,
        grade: gradeForRank(rankIndex, picked.length),
        difficulty: safeDiff,
        meta: { difficulty: safeDiff },
        updatedAt: updatedAtForPlayer(player.id, slug, safeDiff),
        isMe: false,
        equippedTitle: getVirtualPlayerEquippedTitle(player.id),
      } satisfies LeaderboardPublicEntry;
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
    })
    .map((entry, index) => ({ ...entry, rank: index + 1 }));

  return scored;
}

/**
 * 合併真實與注入分數：同名優先真實玩家；分數高者在前。
 */
export function mergeGameLeaderboardWithVirtual(
  real: LeaderboardPublicEntry[],
  virtual: LeaderboardPublicEntry[],
  limit: number
): LeaderboardPublicEntry[] {
  const byName = new Map<string, LeaderboardPublicEntry>();
  const realNames = new Set(
    real.map((entry) => normalizePlayerNameKey(entry.playerName)).filter(Boolean)
  );

  for (const entry of virtual) {
    const key = normalizePlayerNameKey(entry.playerName);
    if (!key || realNames.has(key)) continue;
    byName.set(key, entry);
  }

  for (const entry of real) {
    const key = normalizePlayerNameKey(entry.playerName) || `me:${entry.updatedAt}`;
    const prev = byName.get(key);
    if (!prev || entry.score >= prev.score || entry.isMe) {
      byName.set(key, entry);
    }
  }

  return [...byName.values()]
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
    })
    .slice(0, Math.max(1, limit))
    .map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));
}
