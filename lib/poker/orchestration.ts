/**
 * 桌級編排輔助（Step 2 純邏輯；Step 3 WebSocket 會呼叫）
 * - 依餘額建議級別
 * - 真人 < 3 時計算需補幾個 AI
 */

import {
  TABLE_TIERS,
  MIN_HUMANS_BEFORE_BOT_FILL,
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

export function botsNeededToFill(
  humanCount: number,
  occupiedSeats: number,
  maxSeats = MAX_SEATS,
): number {
  if (humanCount >= MIN_HUMANS_BEFORE_BOT_FILL) return 0;
  const targetHumansPlusBots = MIN_HUMANS_BEFORE_BOT_FILL;
  const need = Math.max(0, targetHumansPlusBots - occupiedSeats);
  const free = Math.max(0, maxSeats - occupiedSeats);
  return Math.min(need, free);
}

export function botProfileForTier(tier: TableTierId): AiBotProfileId {
  return TABLE_TIERS[tier].botProfile;
}

/** AI 擬人化思考延遲（毫秒） */
export function humanizedBotDelayMs(rng: () => number = Math.random): number {
  return Math.floor(1500 + rng() * 2000); // 1.5s – 3.5s
}
