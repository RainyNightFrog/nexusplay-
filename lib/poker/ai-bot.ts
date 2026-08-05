/**
 * AI 決策引擎：依牌力、底池賠率、位置、行為檔做啟發式行動
 * 並加入 1.5s–3.5s 擬人延遲（由編排層呼叫 humanizedBotDelayMs）
 */

import { evaluateHand, isPairOrBetter } from "./hand-evaluator";
import type {
  AiBotProfileId,
  Card,
  HandSnapshot,
  PlayerActionType,
  SeatPlayer,
} from "./types";

export interface BotDecision {
  type: PlayerActionType;
  /** raise-to（本街目標 committed）；call/check/fold 為 0 */
  amount: number;
}

function holeStrengthPreflop(hole: Card[]): number {
  if (hole.length < 2) return 0;
  const [a, b] = hole;
  const high = Math.max(a!.rank, b!.rank);
  const low = Math.min(a!.rank, b!.rank);
  const paired = a!.rank === b!.rank;
  const suited = a!.suit === b!.suit;
  const gap = high - low;

  let score = high * 2 + low;
  if (paired) score += 18;
  if (suited) score += 4;
  if (gap === 1) score += 3;
  else if (gap === 2) score += 1;
  if (high >= 14) score += 4;
  if (high >= 13 && low >= 12) score += 6;
  // normalize ~0–1
  return Math.min(1, score / 50);
}

function postflopStrength(hole: Card[], board: Card[]): number {
  if (board.length < 3) return holeStrengthPreflop(hole);
  const hand = evaluateHand([...hole, ...board]);
  // score 是 base-15 大整數；用 category 粗估 0–1
  const cat = hand.category;
  const map: Record<string, number> = {
    "high-card": 0.15,
    pair: 0.35,
    "two-pair": 0.55,
    "three-of-a-kind": 0.7,
    straight: 0.8,
    flush: 0.85,
    "full-house": 0.92,
    "four-of-a-kind": 0.97,
    "straight-flush": 0.99,
    "royal-flush": 1,
  };
  let s = map[cat] ?? 0.2;
  if (isPairOrBetter(hand) && board.length >= 3) {
    // 微調：用 score 相對大小（同桌比較時由呼叫端處理）
    s = Math.min(1, s + 0.02);
  }
  return s;
}

function profileThresholds(profile: AiBotProfileId): {
  fold: number;
  call: number;
  raise: number;
  bluff: number;
  aggression: number;
} {
  switch (profile) {
    case "LOOSE_PASSIVE":
      return { fold: 0.12, call: 0.55, raise: 0.85, bluff: 0.05, aggression: 0.25 };
    case "BALANCED":
      return { fold: 0.28, call: 0.55, raise: 0.78, bluff: 0.12, aggression: 0.45 };
    case "TIGHT_AGGRESSIVE":
      return { fold: 0.4, call: 0.58, raise: 0.72, bluff: 0.1, aggression: 0.7 };
    case "GTO_LITE":
      return { fold: 0.35, call: 0.52, raise: 0.68, bluff: 0.18, aggression: 0.75 };
    default:
      return { fold: 0.3, call: 0.55, raise: 0.75, bluff: 0.1, aggression: 0.5 };
  }
}

/**
 * 依當前快照為指定 bot 座位產出決策。
 */
export function decideBotAction(
  snapshot: HandSnapshot,
  seatId: string,
  rng: () => number = Math.random,
): BotDecision {
  const seat = snapshot.seats.find((s) => s.seatId === seatId);
  if (!seat || seat.folded || seat.allIn) {
    return { type: "check", amount: 0 };
  }

  const profile = seat.botProfile ?? "BALANCED";
  const th = profileThresholds(profile);
  const toCall = Math.max(0, snapshot.currentBet - seat.streetCommitted);
  const pot = Math.max(1, snapshot.potTotal);
  const potOdds = toCall / (pot + toCall);
  const strength =
    snapshot.board.length >= 3
      ? postflopStrength(seat.holeCards, snapshot.board)
      : holeStrengthPreflop(seat.holeCards);

  // 位置：愈接近 button 愈鬆
  const n = snapshot.seats.filter((s) => !s.folded).length;
  const dist =
    (seat.seatIndex - snapshot.buttonSeatIndex + 9) % 9;
  const positionBonus = (1 - dist / Math.max(n, 1)) * 0.08;
  const adj = Math.min(1, Math.max(0, strength + positionBonus));

  const roll = rng();

  // 可過牌
  if (toCall <= 0) {
    if (adj >= th.raise && roll < th.aggression) {
      return makeRaise(snapshot, seat, adj, rng);
    }
    if (adj < th.fold * 0.5 && roll < th.bluff) {
      return makeRaise(snapshot, seat, 0.4, rng); // 偶爾虛張
    }
    return { type: "check", amount: 0 };
  }

  // 面對下注
  if (adj < th.fold && adj < potOdds + 0.05) {
    // 鬆被動較少蓋牌
    if (profile === "LOOSE_PASSIVE" && adj > 0.08 && roll < 0.6) {
      return callOrAllIn(seat, toCall);
    }
    return { type: "fold", amount: 0 };
  }

  if (adj >= th.raise && roll < th.aggression + (adj - th.raise)) {
    return makeRaise(snapshot, seat, adj, rng);
  }

  if (adj >= th.call || adj >= potOdds) {
    return callOrAllIn(seat, toCall);
  }

  // 偶爾跟注（魚）
  if (profile === "LOOSE_PASSIVE" && roll < 0.45) {
    return callOrAllIn(seat, toCall);
  }

  return { type: "fold", amount: 0 };
}

function callOrAllIn(seat: SeatPlayer, toCall: number): BotDecision {
  if (toCall >= seat.stack) return { type: "all-in", amount: 0 };
  return { type: "call", amount: 0 };
}

function makeRaise(
  snapshot: HandSnapshot,
  seat: SeatPlayer,
  strength: number,
  rng: () => number,
): BotDecision {
  const minTo = snapshot.minRaiseTo;
  const pot = snapshot.potTotal;
  const sizing = 0.5 + strength * 0.8 + rng() * 0.3; // ~0.5–1.6 pot
  let raiseTo = Math.max(
    minTo,
    seat.streetCommitted + Math.floor(pot * sizing),
  );
  // 相對籌碼
  const maxTo = seat.streetCommitted + seat.stack;
  if (raiseTo >= maxTo * 0.85 || strength > 0.9) {
    return { type: "all-in", amount: 0 };
  }
  raiseTo = Math.min(raiseTo, maxTo);
  if (raiseTo <= snapshot.currentBet) {
    const toCall = snapshot.currentBet - seat.streetCommitted;
    return toCall > 0 ? callOrAllIn(seat, toCall) : { type: "check", amount: 0 };
  }
  return {
    type: snapshot.currentBet === 0 ? "bet" : "raise",
    amount: raiseTo,
  };
}

/** 測試／展示用 bot 暱稱池 */
export const BOT_NAME_POOL = [
  "NeonKoi",
  "VoidDealer",
  "PixelAce",
  "RainChip",
  "FrogBluff",
  "CyberAnte",
  "GlitchQueen",
  "StackRunner",
  "PotOracle",
  "NightSuited",
] as const;
