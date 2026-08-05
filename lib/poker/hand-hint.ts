/**
 * 遊戲中即時牌型提示（僅給自己看）
 */

import { cardFromCode } from "./deck";
import { evaluateHand } from "./hand-evaluator";
import type { HandCategory } from "./types";

export const HAND_CATEGORY_ZH: Record<HandCategory, string> = {
  "royal-flush": "皇家同花順",
  "straight-flush": "同花順",
  "four-of-a-kind": "四條",
  "full-house": "葫蘆",
  flush: "同花",
  straight: "順子",
  "three-of-a-kind": "三條",
  "two-pair": "兩對",
  pair: "一對",
  "high-card": "高牌",
};

const RANK_LABEL: Record<number, string> = {
  14: "A",
  13: "K",
  12: "Q",
  11: "J",
  10: "10",
  9: "9",
  8: "8",
  7: "7",
  6: "6",
  5: "5",
  4: "4",
  3: "3",
  2: "2",
};

function rankLabel(rank: number): string {
  return RANK_LABEL[rank] ?? String(rank);
}

/**
 * 依底牌＋公牌產生繁中牌型提示。
 * 翻牌前僅兩張：口袋對→一對，否則高牌。
 */
export function describeLiveHandZh(
  holeCodes: string[] | undefined,
  boardCodes: string[] | undefined,
): string | null {
  if (!holeCodes || holeCodes.length < 2) return null;
  try {
    const hole = holeCodes.map(cardFromCode);
    const board = (boardCodes ?? []).map(cardFromCode);

    if (board.length < 3) {
      if (hole[0]!.rank === hole[1]!.rank) {
        return `一對（${rankLabel(hole[0]!.rank)}）`;
      }
      const high = Math.max(hole[0]!.rank, hole[1]!.rank);
      const low = Math.min(hole[0]!.rank, hole[1]!.rank);
      return `高牌（${rankLabel(high)}／${rankLabel(low)}）`;
    }

    const ev = evaluateHand([...hole, ...board]);
    const cat = HAND_CATEGORY_ZH[ev.category] ?? ev.label;
    /* 附簡單細節：一對／兩對／三條帶點數 */
    if (ev.category === "pair" && ev.bestCards.length) {
      const pairRank = ev.bestCards.find(
        (c, _i, arr) => arr.filter((x) => x.rank === c.rank).length >= 2,
      )?.rank;
      if (pairRank != null) return `${cat}（${rankLabel(pairRank)}）`;
    }
    return cat;
  } catch {
    return null;
  }
}
