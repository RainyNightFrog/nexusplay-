/**
 * 牌局紀錄：可序列化事件與顯示用格式化
 */

import { evaluateHand } from "./hand-evaluator";
import type { EngineEvent } from "./engine";
import type { Card, Street } from "./types";
import type { PublicHandSnapshot } from "./public-types";

export type HandWinnerInfo = {
  seatId: string;
  name: string;
  amount: number;
  handLabelZh?: string;
};

/** Socket 可安全 JSON 序列化的引擎事件 */
export type PublicEngineEvent =
  | { type: "hand-started"; handId: string }
  | {
      type: "action";
      action: {
        seatId: string;
        type: string;
        amount: number;
        street: Street;
      };
    }
  | {
      type: "street";
      street: Street;
      board: string[];
    }
  | {
      type: "hand-complete";
      handId: string;
      winners: HandWinnerInfo[];
      board: string[];
      potTotal: number;
      showdown: boolean;
    }
  | { type: "error"; message: string };

export type HandLogLine = {
  id: string;
  kind: "meta" | "street" | "action" | "result";
  text: string;
};

export type HandHistoryRecord = {
  id: string;
  handNumber: number;
  handId: string;
  lines: HandLogLine[];
  winners: HandWinnerInfo[];
  board: string[];
  potTotal: number;
  completed: boolean;
  summary: string;
};

const STREET_ZH: Record<string, string> = {
  waiting: "等待",
  preflop: "翻牌前",
  flop: "翻牌",
  turn: "轉牌",
  river: "河牌",
  showdown: "攤牌",
  complete: "結束",
};

const ACTION_ZH: Record<string, string> = {
  fold: "蓋牌",
  check: "過牌",
  call: "跟注",
  bet: "下注",
  raise: "加注至",
  "all-in": "全下",
};

const HAND_CAT_ZH: Record<string, string> = {
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

export function streetLabelZh(street: string): string {
  return STREET_ZH[street] ?? street;
}

export function actionLabelZh(type: string): string {
  return ACTION_ZH[type] ?? type;
}

export function formatCardCode(code: string): string {
  const rank = code[0]!;
  const suit = code[1]!;
  const rankLabel =
    rank === "T" ? "10" : rank;
  const suitGlyph =
    suit === "h" ? "♥" : suit === "d" ? "♦" : suit === "c" ? "♣" : "♠";
  return `${rankLabel}${suitGlyph}`;
}

function handLabelZhFromCards(cards: Card[]): string | undefined {
  if (cards.length < 5) return undefined;
  try {
    const ev = evaluateHand(cards);
    const cat = HAND_CAT_ZH[ev.category] ?? ev.label;
    return cat;
  } catch {
    return undefined;
  }
}

export function serializeEngineEvent(
  ev: EngineEvent,
  nameOf: (seatId: string) => string,
): PublicEngineEvent {
  if (ev.type === "error") {
    return { type: "error", message: ev.message };
  }
  if (ev.type === "hand-started") {
    return { type: "hand-started", handId: ev.snapshot.handId };
  }
  if (ev.type === "action") {
    return {
      type: "action",
      action: {
        seatId: ev.action.seatId,
        type: ev.action.type,
        amount: ev.action.amount,
        street: ev.action.street,
      },
    };
  }
  if (ev.type === "street") {
    return {
      type: "street",
      street: ev.street,
      board: ev.board.map((c) => c.code),
    };
  }

  /* hand-complete */
  const winners: HandWinnerInfo[] = [];
  for (const [seatId, amount] of ev.winners) {
    if (amount <= 0) continue;
    const seat = ev.snapshot.seats.find((s) => s.seatId === seatId);
    let handLabelZh: string | undefined;
    if (seat && !seat.folded && ev.snapshot.board.length >= 3) {
      handLabelZh = handLabelZhFromCards([
        ...seat.holeCards,
        ...ev.snapshot.board,
      ]);
    }
    winners.push({
      seatId,
      name: nameOf(seatId),
      amount,
      handLabelZh,
    });
  }
  winners.sort((a, b) => b.amount - a.amount);

  return {
    type: "hand-complete",
    handId: ev.snapshot.handId,
    winners,
    board: ev.snapshot.board.map((c) => c.code),
    potTotal: winners.reduce((s, w) => s + w.amount, 0),
    showdown: ev.snapshot.board.length >= 3 && winners.length > 0,
  };
}

export function whoName(
  seatId: string,
  mySeatId: string | null,
  snap: PublicHandSnapshot | null,
  fallback?: string,
): string {
  if (mySeatId && seatId === mySeatId) return "你";
  const seat = snap?.seats.find((s) => s.seatId === seatId);
  return seat?.name || fallback || `座位${(seat?.seatIndex ?? 0) + 1}`;
}

export function formatActionLine(
  action: { seatId: string; type: string; amount: number; street?: string },
  who: string,
): string {
  const verb = actionLabelZh(action.type);
  const street =
    action.street && action.street !== "preflop"
      ? `〔${streetLabelZh(action.street)}〕`
      : "";
  if (action.type === "fold" || action.type === "check") {
    return `${street}${who} ${verb}`;
  }
  if (action.type === "all-in") {
    return `${street}${who} ${verb}${
      action.amount ? ` ${action.amount.toLocaleString()}` : ""
    }`;
  }
  if (action.type === "raise") {
    return `${street}${who} ${verb} ${action.amount.toLocaleString()}`;
  }
  return `${street}${who} ${verb} ${action.amount.toLocaleString()}`;
}

export function formatWinnersSummary(
  winners: HandWinnerInfo[],
  mySeatId: string | null,
): string {
  if (winners.length === 0) return "本手無人獲獎";
  return winners
    .map((w) => {
      const name = mySeatId && w.seatId === mySeatId ? "你" : w.name;
      const hand = w.handLabelZh ? `（${w.handLabelZh}）` : "";
      return `${name} 贏得 ${w.amount.toLocaleString()} 積分${hand}`;
    })
    .join(" · ");
}

export function buildHandSummary(
  handNumber: number,
  winners: HandWinnerInfo[],
  mySeatId: string | null,
): string {
  if (winners.length === 0) return `第 ${handNumber} 手 · 結束`;
  const top = winners[0]!;
  const name = mySeatId && top.seatId === mySeatId ? "你" : top.name;
  const extra =
    winners.length > 1 ? ` 等 ${winners.length} 人` : "";
  return `第 ${handNumber} 手 · ${name}${extra} +${top.amount.toLocaleString()}`;
}
