/**
 * 7 張牌力評估器（決定性、可比較）
 * 從 C(7,5)=21 組五張牌中取最佳；亦支援直接評估 5 張。
 */

import {
  type Card,
  type EvaluatedHand,
  type HandCategory,
  HAND_CATEGORY_RANK,
} from "./types";

const RANK_NAMES: Record<number, string> = {
  2: "2",
  3: "3",
  4: "4",
  5: "5",
  6: "6",
  7: "7",
  8: "8",
  9: "9",
  10: "T",
  11: "J",
  12: "Q",
  13: "K",
  14: "A",
};

function combinations<T>(arr: T[], k: number): T[][] {
  const result: T[][] = [];
  const n = arr.length;
  if (k > n || k <= 0) return result;

  const indices = Array.from({ length: k }, (_, i) => i);
  const pushCombo = () => result.push(indices.map((i) => arr[i]!));

  pushCombo();
  while (true) {
    let i = k - 1;
    while (i >= 0 && indices[i] === i + n - k) i--;
    if (i < 0) break;
    indices[i]!++;
    for (let j = i + 1; j < k; j++) {
      indices[j] = indices[j - 1]! + 1;
    }
    pushCombo();
  }
  return result;
}

function isStraightRanks(sortedDescUnique: number[]): number | null {
  // 一般順子
  if (sortedDescUnique.length < 5) return null;
  for (let i = 0; i <= sortedDescUnique.length - 5; i++) {
    const window = sortedDescUnique.slice(i, i + 5);
    let ok = true;
    for (let j = 1; j < 5; j++) {
      if (window[j - 1]! - window[j]! !== 1) {
        ok = false;
        break;
      }
    }
    if (ok) return window[0]!;
  }
  // A-5 輪子：A,5,4,3,2 → high = 5
  const set = new Set(sortedDescUnique);
  if (set.has(14) && set.has(5) && set.has(4) && set.has(3) && set.has(2)) {
    return 5;
  }
  return null;
}

interface FiveEval {
  category: HandCategory;
  /** [categoryRank, kickers...] 用於組 score */
  ranks: number[];
  cards: Card[];
}

function evaluateFive(cards: Card[]): FiveEval {
  if (cards.length !== 5) {
    throw new Error("evaluateFive requires exactly 5 cards");
  }

  const byRank = new Map<number, Card[]>();
  for (const c of cards) {
    const list = byRank.get(c.rank) ?? [];
    list.push(c);
    byRank.set(c.rank, list);
  }

  const sorted = cards.slice().sort((a, b) => b.rank - a.rank);
  const uniqueRanksDesc = [...new Set(sorted.map((c) => c.rank))];
  const flushSuit = (() => {
    const counts = [0, 0, 0, 0];
    for (const c of cards) counts[c.suit]!++;
    const suit = counts.findIndex((n) => n === 5);
    return suit >= 0 ? suit : null;
  })();
  const isFlush = flushSuit !== null;
  const straightHigh = isStraightRanks(uniqueRanksDesc);

  const groups = [...byRank.entries()]
    .map(([rank, cs]) => ({ rank, count: cs.length, cards: cs }))
    .sort((a, b) => b.count - a.count || b.rank - a.rank);

  // Royal / Straight Flush
  if (isFlush && straightHigh !== null) {
    const flushCards = cards
      .filter((c) => c.suit === flushSuit)
      .sort((a, b) => b.rank - a.rank);
    // 輪子順子要重排顯示順序
    const category: HandCategory =
      straightHigh === 14 ? "royal-flush" : "straight-flush";
    return {
      category,
      ranks: [HAND_CATEGORY_RANK[category], straightHigh],
      cards: flushCards,
    };
  }

  // Quads
  if (groups[0]?.count === 4) {
    const quad = groups[0]!;
    const kicker = groups[1]!;
    return {
      category: "four-of-a-kind",
      ranks: [HAND_CATEGORY_RANK["four-of-a-kind"], quad.rank, kicker.rank],
      cards: [...quad.cards, ...kicker.cards],
    };
  }

  // Full house
  if (groups[0]?.count === 3 && groups[1]?.count === 2) {
    return {
      category: "full-house",
      ranks: [
        HAND_CATEGORY_RANK["full-house"],
        groups[0]!.rank,
        groups[1]!.rank,
      ],
      cards: [...groups[0]!.cards, ...groups[1]!.cards],
    };
  }

  // Flush
  if (isFlush) {
    const ranks = sorted.map((c) => c.rank);
    return {
      category: "flush",
      ranks: [HAND_CATEGORY_RANK.flush, ...ranks],
      cards: sorted,
    };
  }

  // Straight
  if (straightHigh !== null) {
    // 選出構成順子的五張（輪子時 A 當 1）
    let straightCards: Card[];
    if (straightHigh === 5 && uniqueRanksDesc.includes(14)) {
      const need = new Set([14, 5, 4, 3, 2]);
      straightCards = [];
      for (const r of [5, 4, 3, 2, 14]) {
        const c = cards.find((x) => x.rank === r && need.has(x.rank));
        if (c) {
          straightCards.push(c);
          need.delete(r);
        }
      }
    } else {
      straightCards = [];
      for (let r = straightHigh; r > straightHigh - 5; r--) {
        const c = cards.find((x) => x.rank === r);
        if (c) straightCards.push(c);
      }
    }
    return {
      category: "straight",
      ranks: [HAND_CATEGORY_RANK.straight, straightHigh],
      cards: straightCards,
    };
  }

  // Trips
  if (groups[0]?.count === 3) {
    const trip = groups[0]!;
    const kickers = groups
      .slice(1)
      .flatMap((g) => g.cards)
      .sort((a, b) => b.rank - a.rank)
      .slice(0, 2);
    return {
      category: "three-of-a-kind",
      ranks: [
        HAND_CATEGORY_RANK["three-of-a-kind"],
        trip.rank,
        ...kickers.map((c) => c.rank),
      ],
      cards: [...trip.cards, ...kickers],
    };
  }

  // Two pair
  if (groups[0]?.count === 2 && groups[1]?.count === 2) {
    const highPair = groups[0]!;
    const lowPair = groups[1]!;
    const kicker = groups[2]!;
    return {
      category: "two-pair",
      ranks: [
        HAND_CATEGORY_RANK["two-pair"],
        highPair.rank,
        lowPair.rank,
        kicker.rank,
      ],
      cards: [...highPair.cards, ...lowPair.cards, ...kicker.cards],
    };
  }

  // One pair
  if (groups[0]?.count === 2) {
    const pair = groups[0]!;
    const kickers = groups
      .slice(1)
      .flatMap((g) => g.cards)
      .sort((a, b) => b.rank - a.rank)
      .slice(0, 3);
    return {
      category: "pair",
      ranks: [
        HAND_CATEGORY_RANK.pair,
        pair.rank,
        ...kickers.map((c) => c.rank),
      ],
      cards: [...pair.cards, ...kickers],
    };
  }

  // High card
  const ranks = sorted.map((c) => c.rank);
  return {
    category: "high-card",
    ranks: [HAND_CATEGORY_RANK["high-card"], ...ranks],
    cards: sorted,
  };
}

/** 將 ranks 編碼成單一可比較整數（base-15） */
export function encodeHandScore(ranks: number[]): number {
  let score = 0;
  for (const r of ranks) {
    score = score * 15 + r;
  }
  // 左側補齊至最多 6 個分量（category + 5 kickers）
  for (let i = ranks.length; i < 6; i++) {
    score = score * 15;
  }
  return score;
}

function labelFor(category: HandCategory, ranks: number[]): string {
  const n = (r: number) => RANK_NAMES[r] ?? String(r);
  switch (category) {
    case "royal-flush":
      return "Royal Flush";
    case "straight-flush":
      return `Straight Flush, ${n(ranks[1]!)} high`;
    case "four-of-a-kind":
      return `Four of a Kind, ${n(ranks[1]!)}s`;
    case "full-house":
      return `Full House, ${n(ranks[1]!)}s full of ${n(ranks[2]!)}s`;
    case "flush":
      return `Flush, ${n(ranks[1]!)} high`;
    case "straight":
      return `Straight, ${n(ranks[1]!)} high`;
    case "three-of-a-kind":
      return `Three of a Kind, ${n(ranks[1]!)}s`;
    case "two-pair":
      return `Two Pair, ${n(ranks[1]!)}s and ${n(ranks[2]!)}s`;
    case "pair":
      return `Pair of ${n(ranks[1]!)}s`;
    default:
      return `High Card, ${n(ranks[1]!)}`;
  }
}

export function evaluateFiveCardHand(cards: Card[]): EvaluatedHand {
  const ev = evaluateFive(cards);
  return {
    category: ev.category,
    score: encodeHandScore(ev.ranks),
    bestCards: ev.cards,
    label: labelFor(ev.category, ev.ranks),
  };
}

/**
 * 評估 5–7 張牌，取最佳五張組合。
 * Hold'em：2 hole + 最多 5 board = 7。
 */
export function evaluateHand(cards: Card[]): EvaluatedHand {
  if (cards.length < 5) {
    throw new Error(`Need at least 5 cards, got ${cards.length}`);
  }
  if (cards.length === 5) {
    return evaluateFiveCardHand(cards);
  }
  if (cards.length > 7) {
    throw new Error(`At most 7 cards supported, got ${cards.length}`);
  }

  let best: EvaluatedHand | null = null;
  for (const combo of combinations(cards, 5)) {
    const ev = evaluateFiveCardHand(combo);
    if (!best || ev.score > best.score) {
      best = ev;
    }
  }
  return best!;
}

/** 比較兩手牌：>0 a 勝，<0 b 勝，0 平分 */
export function compareHands(a: EvaluatedHand, b: EvaluatedHand): number {
  return a.score - b.score;
}

/** 是否至少一對（任務用） */
export function isPairOrBetter(hand: EvaluatedHand): boolean {
  return HAND_CATEGORY_RANK[hand.category] >= HAND_CATEGORY_RANK.pair;
}
