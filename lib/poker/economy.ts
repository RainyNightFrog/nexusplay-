/**
 * 簽到／在線獎勵／破產保護常數（Step 1–2 共用，供後續 economy API 使用）
 */

/** Day 1–7 簽到獎勵（積分） */
export const CHECKIN_REWARDS: readonly number[] = [
  1_000, // Day 1
  2_000, // Day 2
  3_000, // Day 3
  5_000, // Day 4
  7_000, // Day 5
  10_000, // Day 6
  50_000, // Day 7 milestone
] as const;

export const PLAYTIME_INTERVAL_MS = 10 * 60 * 1000;
export const PLAYTIME_REWARD_POINTS = 500;
export const PLAYTIME_MAX_TICKS_PER_DAY = 6;
/** 每個區間至少打完 1 手才發獎（Anti-AFK） */
export const PLAYTIME_MIN_HANDS_PER_INTERVAL = 1;

export const BANKRUPTCY_THRESHOLD = 100;
export const BANKRUPTCY_REBUY_AMOUNT = 1_000;
export const BANKRUPTCY_MAX_REBUYS_PER_DAY = 3;

export function checkinRewardForStreakDay(streakDay: number): number {
  const idx = Math.min(Math.max(streakDay, 1), 7) - 1;
  return CHECKIN_REWARDS[idx]!;
}
