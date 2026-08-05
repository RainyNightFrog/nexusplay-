/**
 * 虛擬對手決策：偏 GTO／緊兇，控制全下頻率。
 * - 不無腦 all-in；僅超強牌、低 SPR 承諾、或短碼合理場合才推入
 * - 允許中等底池尺度的虛張（非全下）
 */

import { evaluateHand } from "./hand-evaluator";
import type {
  AiBotProfileId,
  Card,
  HandCategory,
  HandSnapshot,
  PlayerActionType,
  SeatPlayer,
} from "./types";

export interface BotDecision {
  type: PlayerActionType;
  /** raise-to（本街目標 committed）；call/check/fold 為 0 */
  amount: number;
}

type MadeStrength = {
  /** 0–1 綜合牌力 */
  score: number;
  category: HandCategory | "preflop";
  /** 接近堅果／可價值全下 */
  monster: boolean;
  /** 強成牌（兩對以上或超對級） */
  strong: boolean;
  /** 中等可繼續（頂對、中對偏強） */
  medium: boolean;
};

function profileStyle(profile: AiBotProfileId): {
  /** 翻前開池門檻（越高越緊） */
  openMin: number;
  /** 面對加注的跟注門檻 */
  defendMin: number;
  /** 3bet／價值加注門檻 */
  raiseMin: number;
  /** 虛張頻率（過牌機會） */
  bluffFreq: number;
  /** 翻後持續下注頻率（有利牌） */
  cbetFreq: number;
  /** 相對 GTO 的鬆緊：1=緊 */
  tightness: number;
} {
  switch (profile) {
    case "LOOSE_PASSIVE":
      /* 仍收斂：不再當魚亂跟全下 */
      return {
        openMin: 0.42,
        defendMin: 0.38,
        raiseMin: 0.72,
        bluffFreq: 0.06,
        cbetFreq: 0.45,
        tightness: 0.7,
      };
    case "BALANCED":
      return {
        openMin: 0.48,
        defendMin: 0.44,
        raiseMin: 0.7,
        bluffFreq: 0.1,
        cbetFreq: 0.55,
        tightness: 0.85,
      };
    case "TIGHT_AGGRESSIVE":
      return {
        openMin: 0.55,
        defendMin: 0.5,
        raiseMin: 0.68,
        bluffFreq: 0.12,
        cbetFreq: 0.62,
        tightness: 0.95,
      };
    case "GTO_LITE":
    default:
      return {
        openMin: 0.52,
        defendMin: 0.46,
        raiseMin: 0.66,
        bluffFreq: 0.14,
        cbetFreq: 0.58,
        tightness: 1,
      };
  }
}

/** 翻前：Chen 公式風格，輸出 0–1 */
function holeStrengthPreflop(hole: Card[]): number {
  if (hole.length < 2) return 0;
  const [a, b] = hole;
  const high = Math.max(a!.rank, b!.rank);
  const low = Math.min(a!.rank, b!.rank);
  const paired = a!.rank === b!.rank;
  const suited = a!.suit === b!.suit;
  const gap = high - low;

  let score = high * 2 + low * 0.5;
  if (paired) score += 22;
  if (suited) score += 5;
  if (gap === 1) score += 4;
  else if (gap === 2) score += 2;
  else if (gap >= 4 && !paired) score -= 3;
  if (high >= 14) score += 5;
  if (high >= 13 && low >= 12) score += 8;
  if (high >= 14 && low >= 12) score += 4;
  /* 垃圾斷連非同花 */
  if (!paired && !suited && gap >= 5 && low <= 9) score -= 6;
  return Math.min(1, Math.max(0, score / 55));
}

function isPremiumPreflop(hole: Card[]): boolean {
  if (hole.length < 2) return false;
  const [a, b] = hole;
  const high = Math.max(a!.rank, b!.rank);
  const low = Math.min(a!.rank, b!.rank);
  const paired = a!.rank === b!.rank;
  if (paired && high >= 12) return true; // QQ+
  if (paired && high >= 10) return true; // TT+
  if (high === 14 && low >= 12) return true; // AK AQ
  if (high === 14 && low === 11 && a!.suit === b!.suit) return true; // AJs
  if (high === 13 && low === 12 && a!.suit === b!.suit) return true; // KQs
  return false;
}

function analyzeMade(
  hole: Card[],
  board: Card[],
): MadeStrength {
  if (board.length < 3) {
    const s = holeStrengthPreflop(hole);
    return {
      score: s,
      category: "preflop",
      monster: isPremiumPreflop(hole) && s >= 0.78,
      strong: s >= 0.7,
      medium: s >= 0.52,
    };
  }

  const hand = evaluateHand([...hole, ...board]);
  const cat = hand.category;
  /* 公牌成對／三條等：成牌價值略打折，避免公對狂推 */
  const boardRanks = board.map((c) => c.rank);
  const rankCounts = new Map<number, number>();
  for (const r of boardRanks) {
    rankCounts.set(r, (rankCounts.get(r) ?? 0) + 1);
  }
  const boardPaired = [...rankCounts.values()].some((n) => n >= 2);
  const boardTrips = [...rankCounts.values()].some((n) => n >= 3);
  const suitCounts = new Map<string, number>();
  for (const c of board) {
    suitCounts.set(c.suit, (suitCounts.get(c.suit) ?? 0) + 1);
  }
  const boardFlushy = [...suitCounts.values()].some((n) => n >= 3);
  const boardScary = boardTrips || (boardPaired && boardFlushy);

  const base: Record<HandCategory, number> = {
    "high-card": 0.12,
    pair: 0.38,
    "two-pair": 0.62,
    "three-of-a-kind": 0.76,
    straight: 0.84,
    flush: 0.88,
    "full-house": 0.94,
    "four-of-a-kind": 0.98,
    "straight-flush": 0.995,
    "royal-flush": 1,
  };
  let score = base[cat] ?? 0.2;

  /* 頂對／超對粗估 */
  if (cat === "pair" && hole.length === 2) {
    const boardMax = Math.max(...board.map((c) => c.rank));
    const holeMax = Math.max(hole[0]!.rank, hole[1]!.rank);
    const paired =
      hole[0]!.rank === hole[1]!.rank
        ? hole[0]!.rank
        : hole.find((h) => board.some((b) => b.rank === h.rank))?.rank;
    if (paired && paired >= boardMax) score = Math.max(score, 0.52);
    if (paired && paired >= 13 && paired >= boardMax) score = Math.max(score, 0.58);
    if (holeMax >= 14 && paired === holeMax) score = Math.max(score, 0.55);
  }

  if (boardScary && HAND_RANK[cat] <= HAND_RANK.pair) {
    score *= 0.75;
  }
  if (boardPaired && cat === "pair") {
    score *= 0.9;
  }

  const monster =
    cat === "royal-flush" ||
    cat === "straight-flush" ||
    cat === "four-of-a-kind" ||
    cat === "full-house" ||
    (cat === "flush" && !boardFlushy) ||
    (cat === "straight" && !boardTrips);

  const strong =
    monster ||
    cat === "three-of-a-kind" ||
    cat === "two-pair" ||
    score >= 0.7;

  const medium = strong || score >= 0.48;

  return { score: Math.min(1, score), category: cat, monster, strong, medium };
}

const HAND_RANK: Record<HandCategory, number> = {
  "high-card": 0,
  pair: 1,
  "two-pair": 2,
  "three-of-a-kind": 3,
  straight: 4,
  flush: 5,
  "full-house": 6,
  "four-of-a-kind": 7,
  "straight-flush": 8,
  "royal-flush": 9,
};

function stackBb(seat: SeatPlayer, bb: number): number {
  return seat.stack / Math.max(1, bb);
}

function spr(seat: SeatPlayer, pot: number): number {
  return seat.stack / Math.max(1, pot);
}

/**
 * 是否允許價值全下（嚴格）
 */
function allowValueShove(
  made: MadeStrength,
  seat: SeatPlayer,
  snapshot: HandSnapshot,
  toCall: number,
): boolean {
  const bb = snapshot.bigBlind;
  const bbLeft = stackBb(seat, bb);
  const pot = Math.max(1, snapshot.potTotal);
  const ratio = spr(seat, pot + toCall);

  if (made.monster) return true;

  /* 短碼：≤12bb 可用強牌／優質翻前推 */
  if (bbLeft <= 12 && made.strong) return true;
  if (bbLeft <= 10 && made.score >= 0.62) return true;
  if (
    snapshot.board.length === 0 &&
    bbLeft <= 14 &&
    isPremiumPreflop(seat.holeCards)
  ) {
    return true;
  }

  /* 低 SPR：籌碼已相對底池承諾，兩對以上可推 */
  if (ratio <= 1.2 && made.strong) return true;
  if (ratio <= 2.0 && made.monster) return true;
  if (ratio <= 0.8 && made.medium && made.score >= 0.55) return true;

  /* 跟注會吃掉大半籌碼 → 視同承諾：僅強牌才跟成全下 */
  if (toCall >= seat.stack * 0.65 && made.strong) return true;
  if (toCall >= seat.stack && made.score >= 0.58) return true;

  return false;
}

function clampRaiseTo(
  snapshot: HandSnapshot,
  seat: SeatPlayer,
  raiseTo: number,
): BotDecision {
  const minTo = snapshot.minRaiseTo;
  const maxTo = seat.streetCommitted + seat.stack;
  let to = Math.max(minTo, Math.floor(raiseTo));
  to = Math.min(to, maxTo);

  if (to >= maxTo) {
    return { type: "all-in", amount: 0 };
  }
  if (to <= snapshot.currentBet) {
    const toCall = snapshot.currentBet - seat.streetCommitted;
    if (toCall <= 0) return { type: "check", amount: 0 };
    if (toCall >= seat.stack) return { type: "all-in", amount: 0 };
    return { type: "call", amount: 0 };
  }
  return {
    type: snapshot.currentBet === 0 ? "bet" : "raise",
    amount: to,
  };
}

/** 標準底池比例加注；預設絕不因「加注太大」誤觸發全下 */
function makeSizedBet(
  snapshot: HandSnapshot,
  seat: SeatPlayer,
  potFraction: number,
  made: MadeStrength,
  allowShove: boolean,
): BotDecision {
  const pot = Math.max(snapshot.potTotal, snapshot.bigBlind * 2);
  const add = Math.floor(pot * potFraction);
  let raiseTo = seat.streetCommitted + Math.max(snapshot.bigBlind, add);
  raiseTo = Math.max(raiseTo, snapshot.minRaiseTo);

  const maxTo = seat.streetCommitted + seat.stack;
  /* 若尺寸會吃掉 >70% 籌碼，改為較小下注或放棄加注 */
  if (raiseTo >= maxTo * 0.7) {
    if (allowShove && allowValueShove(made, seat, snapshot, 0)) {
      return { type: "all-in", amount: 0 };
    }
    /* 改下約 40% 底池，保留籌碼 */
    raiseTo = seat.streetCommitted + Math.floor(pot * 0.4);
    raiseTo = Math.max(raiseTo, snapshot.minRaiseTo);
    if (raiseTo >= maxTo * 0.7) {
      /* 短碼：只在允許時推，否則過牌／最小跟 */
      if (allowShove && allowValueShove(made, seat, snapshot, 0)) {
        return { type: "all-in", amount: 0 };
      }
      const toCall = snapshot.currentBet - seat.streetCommitted;
      if (toCall <= 0) return { type: "check", amount: 0 };
      return safeCall(seat, toCall, made, snapshot);
    }
  }

  return clampRaiseTo(snapshot, seat, raiseTo);
}

function safeCall(
  seat: SeatPlayer,
  toCall: number,
  made: MadeStrength,
  snapshot: HandSnapshot,
): BotDecision {
  if (toCall <= 0) return { type: "check", amount: 0 };
  if (toCall >= seat.stack) {
    if (allowValueShove(made, seat, snapshot, toCall)) {
      return { type: "all-in", amount: 0 };
    }
    return { type: "fold", amount: 0 };
  }
  /* 跟注超過一半籌碼：需中強以上 */
  if (toCall >= seat.stack * 0.5 && !made.strong && made.score < 0.6) {
    return { type: "fold", amount: 0 };
  }
  return { type: "call", amount: 0 };
}

function positionBonus(snapshot: HandSnapshot, seat: SeatPlayer): number {
  const alive = snapshot.seats.filter((s) => !s.folded && !s.sittingOut);
  const n = Math.max(alive.length, 2);
  const dist =
    (seat.seatIndex - snapshot.buttonSeatIndex + 9) % 9;
  /* 莊位附近略鬆 */
  return (1 - dist / 9) * 0.06 * (n / 9);
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

  const profile = seat.botProfile ?? "GTO_LITE";
  const style = profileStyle(profile);
  const toCall = Math.max(0, snapshot.currentBet - seat.streetCommitted);
  const pot = Math.max(1, snapshot.potTotal);
  const potOdds = toCall / (pot + toCall);
  const made = analyzeMade(seat.holeCards, snapshot.board);
  const pos = positionBonus(snapshot, seat);
  const score = Math.min(1, Math.max(0, made.score + pos));
  const bbLeft = stackBb(seat, snapshot.bigBlind);
  const roll = rng();

  /* ---------- 可過牌：下注或過牌 ---------- */
  if (toCall <= 0) {
    /* 價值下注 */
    if (made.monster || (made.strong && roll < style.cbetFreq + 0.15)) {
      const frac = made.monster
        ? 0.55 + rng() * 0.35
        : 0.4 + rng() * 0.35;
      return makeSizedBet(snapshot, seat, frac, made, true);
    }
    if (made.medium && roll < style.cbetFreq) {
      return makeSizedBet(snapshot, seat, 0.33 + rng() * 0.25, made, false);
    }
    /* 合理虛張：僅中小注，絕不 bluff shove */
    if (
      !made.medium &&
      roll < style.bluffFreq &&
      bbLeft >= 18 &&
      snapshot.board.length >= 3
    ) {
      return makeSizedBet(snapshot, seat, 0.4 + rng() * 0.25, made, false);
    }
    /* 翻前開池 */
    if (snapshot.board.length === 0 && score >= style.openMin) {
      const openTo =
        seat.streetCommitted +
        Math.floor(snapshot.bigBlind * (2.2 + rng() * 0.5));
      if (
        bbLeft <= 12 &&
        isPremiumPreflop(seat.holeCards) &&
        allowValueShove(made, seat, snapshot, 0)
      ) {
        return { type: "all-in", amount: 0 };
      }
      return clampRaiseTo(snapshot, seat, openTo);
    }
    return { type: "check", amount: 0 };
  }

  /* ---------- 面對下注／加注 ---------- */
  const betPctOfPot = toCall / pot;

  /* 超大注（>75% pot）或超過半棧：極緊 */
  const hugePressure =
    betPctOfPot >= 0.75 || toCall >= seat.stack * 0.45;

  if (hugePressure && !made.strong && score < 0.62) {
    return { type: "fold", amount: 0 };
  }

  /* 價值加注／3bet */
  if (
    (made.monster || (made.strong && score >= style.raiseMin)) &&
    roll < 0.55 + style.tightness * 0.2
  ) {
    if (allowValueShove(made, seat, snapshot, toCall) && betPctOfPot >= 0.5) {
      return { type: "all-in", amount: 0 };
    }
    const threeBetFrac = snapshot.board.length === 0 ? 2.8 + rng() : 0.65 + rng() * 0.35;
    if (snapshot.board.length === 0) {
      const raiseTo = Math.max(
        snapshot.minRaiseTo,
        snapshot.currentBet * threeBetFrac,
      );
      const dec = clampRaiseTo(snapshot, seat, raiseTo);
      if (dec.type === "all-in" && !allowValueShove(made, seat, snapshot, toCall)) {
        return safeCall(seat, toCall, made, snapshot);
      }
      return dec;
    }
    return makeSizedBet(snapshot, seat, threeBetFrac, made, true);
  }

  /* 偶發虛張加注（翻後、位置好、對手注不大） */
  if (
    snapshot.board.length >= 3 &&
    !made.medium &&
    betPctOfPot <= 0.4 &&
    roll < style.bluffFreq * 0.45 &&
    bbLeft >= 25
  ) {
    return makeSizedBet(snapshot, seat, 0.55 + rng() * 0.2, made, false);
  }

  /* 底池賠率＋牌力決定跟注 */
  const callThreshold = style.defendMin - potOdds * 0.35;
  if (score >= callThreshold || (made.medium && potOdds <= 0.35)) {
    return safeCall(seat, toCall, made, snapshot);
  }

  if (made.strong) {
    return safeCall(seat, toCall, made, snapshot);
  }

  return { type: "fold", amount: 0 };
}

/** @deprecated 已改用平台虛擬玩家常客池（virtual-roster） */
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
