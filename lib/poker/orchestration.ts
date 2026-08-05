/**
 * 桌級編排輔助（Step 2 純邏輯；Step 3 WebSocket 會呼叫）
 * - 依餘額建議級別
 * - 空桌 AI 隨機 5–7 人，留空位；真人入座優先坐空位，滿則 AI 讓位
 */

import {
  TABLE_TIERS,
  MIN_BOTS_AT_TABLE,
  MAX_SEATS,
  type TableTierId,
  type AiBotProfileId,
} from "./types";

export function suggestTierForBalance(pointsBalance: number): TableTierId {
  // 由高到低：能負擔最低買入才進該級
  const order: TableTierId[] = ["HIGH", "MID", "LOW", "MICRO"];
  for (const id of order) {
    if (pointsBalance >= TABLE_TIERS[id].minBuyIn) return id;
  }
  return "MICRO";
}

/** 湊滿 maxSeats；並確保最終 bots >= MIN_BOTS_AT_TABLE（受空位限制） */
export function botsNeededToFill(
  _humanCount: number,
  occupiedSeats: number,
  maxSeats = MAX_SEATS,
  currentBotCount = 0,
  minBots = MIN_BOTS_AT_TABLE,
): number {
  const free = Math.max(0, maxSeats - occupiedSeats);
  const toFull = free;
  const botsAfter = currentBotCount + toFull;
  if (botsAfter >= minBots) return toFull;
  return free;
}

export function botProfileForTier(tier: TableTierId): AiBotProfileId {
  return TABLE_TIERS[tier].botProfile;
}

/** AI 擬人化思考延遲（毫秒） */
export function humanizedBotDelayMs(rng: () => number = Math.random): number {
  return Math.floor(1500 + rng() * 2000); // 1.5s – 3.5s
}
