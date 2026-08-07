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
  holeCards?: string[];
};

/** 單座位本手結算明細（含投入／贏得／淨值；攤牌時含底牌） */
export type HandSeatResult = {
  seatId: string;
  name: string;
  seatIndex: number;
  folded: boolean;
  allIn: boolean;
  /** 本手投入底池總額 */
  committed: number;
  /** 分到的獎金 */
  won: number;
  /** 淨輸贏 = won - committed */
  net: number;
  handLabelZh?: string;
  /** 攤牌公開的底牌；客戶端可再補上自己的底牌 */
  holeCards?: string[];
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
      seats: HandSeatResult[];
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
  /** 本手參與者勝負明細 */
  seats: HandSeatResult[];
  board: string[];
  potTotal: number;
  showdown: boolean;
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
  const survivors = ev.snapshot.seats.filter((s) => !s.folded);
  const isShowdown =
    survivors.length >= 2 && ev.snapshot.board.length >= 3;

  const seats: HandSeatResult[] = ev.snapshot.seats
    .filter((s) => s.committed > 0 || s.holeCards.length > 0)
    .map((seat) => {
      const won = ev.winners.get(seat.seatId) ?? 0;
      const committed = seat.committed;
      let handLabelZh: string | undefined;
      if (!seat.folded && ev.snapshot.board.length >= 3) {
        handLabelZh = handLabelZhFromCards([
          ...seat.holeCards,
          ...ev.snapshot.board,
        ]);
      }
      /* 僅攤牌公開未蓋牌者底牌；棄牌者不外洩 */
      const holeCards =
        isShowdown && !seat.folded
          ? seat.holeCards.map((c) => c.code)
          : undefined;
      return {
        seatId: seat.seatId,
        name: nameOf(seat.seatId),
        seatIndex: seat.seatIndex,
        folded: seat.folded,
        allIn: seat.allIn,
        committed,
        won,
        net: won - committed,
        handLabelZh,
        holeCards,
      };
    })
    .sort((a, b) => {
      /* 贏家優先，其餘依淨值、座位 */
      if (a.won !== b.won) return b.won - a.won;
      if (a.net !== b.net) return b.net - a.net;
      return a.seatIndex - b.seatIndex;
    });

  const winners: HandWinnerInfo[] = seats
    .filter((s) => s.won > 0)
    .map((s) => ({
      seatId: s.seatId,
      name: s.name,
      amount: s.won,
      handLabelZh: s.handLabelZh,
      holeCards: s.holeCards,
    }));

  return {
    type: "hand-complete",
    handId: ev.snapshot.handId,
    winners,
    seats,
    board: ev.snapshot.board.map((c) => c.code),
    potTotal: winners.reduce((s, w) => s + w.amount, 0),
    showdown: isShowdown,
  };
}

/** 用公開快照補上自己的底牌（棄牌時事件不會帶） */
export function mergeSeatHoleCardsFromSnapshot(
  seats: HandSeatResult[],
  snap: PublicHandSnapshot | null | undefined,
  mySeatId: string | null,
): HandSeatResult[] {
  if (!snap?.seats?.length) return seats;
  return seats.map((r) => {
    if (r.holeCards?.length) return r;
    const fromSnap = snap.seats.find((s) => s.seatId === r.seatId);
    if (!fromSnap?.holeCards?.length) return r;
    /* 快照僅含自己或攤牌公開牌，可安心合併 */
    if (mySeatId && r.seatId === mySeatId) {
      return { ...r, holeCards: fromSnap.holeCards.slice() };
    }
    if (!r.folded && fromSnap.holeCards.length) {
      return { ...r, holeCards: fromSnap.holeCards.slice() };
    }
    return r;
  });
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

export function formatNetZh(net: number): string {
  if (net > 0) return `+${net.toLocaleString()}`;
  if (net < 0) return net.toLocaleString();
  return "±0";
}

export function formatWinnersSummary(
  winners: HandWinnerInfo[],
  mySeatId: string | null,
  seats?: HandSeatResult[],
): string {
  if (winners.length === 0) return "本手無人獲獎";
  const parts = winners.map((w) => {
    const name = mySeatId && w.seatId === mySeatId ? "你" : w.name;
    const hand = w.handLabelZh ? `（${w.handLabelZh}）` : "";
    const cards =
      w.holeCards?.length
        ? `〔${w.holeCards.map(formatCardCode).join(" ")}〕`
        : "";
    return `${name}${cards} 贏得 ${w.amount.toLocaleString()} 積分${hand}`;
  });
  if (mySeatId && seats?.length) {
    const mine = seats.find((s) => s.seatId === mySeatId);
    if (mine && mine.won <= 0 && mine.committed > 0) {
      parts.push(`你 ${formatNetZh(mine.net)}`);
    }
  }
  return parts.join(" · ");
}

export function buildHandSummary(
  handNumber: number,
  winners: HandWinnerInfo[],
  mySeatId: string | null,
  seats?: HandSeatResult[],
): string {
  const mine = mySeatId
    ? seats?.find((s) => s.seatId === mySeatId)
    : undefined;
  if (mine && mine.committed > 0) {
    const tag =
      mine.net > 0 ? "贏" : mine.net < 0 ? "輸" : "平";
    return `第 ${handNumber} 手 · 你${tag} ${formatNetZh(mine.net)}`;
  }
  if (winners.length === 0) return `第 ${handNumber} 手 · 結束`;
  const top = winners[0]!;
  const name = mySeatId && top.seatId === mySeatId ? "你" : top.name;
  const extra =
    winners.length > 1 ? ` 等 ${winners.length} 人` : "";
  return `第 ${handNumber} 手 · ${name}${extra} +${top.amount.toLocaleString()}`;
}

/** 產生勝負明細文字行（寫入牌局 log） */
export function formatSeatResultLines(
  seats: HandSeatResult[],
  mySeatId: string | null,
): string[] {
  return seats.map((s) => {
    const name = mySeatId && s.seatId === mySeatId ? "你" : s.name;
    const cards = s.holeCards?.length
      ? ` ${s.holeCards.map(formatCardCode).join(" ")}`
      : "";
    const status = s.folded
      ? "蓋牌"
      : s.handLabelZh
        ? s.handLabelZh
        : s.allIn
          ? "全下"
          : "攤牌";
    const wonPart =
      s.won > 0 ? ` · 贏得 ${s.won.toLocaleString()}` : "";
    return `${name}${cards} · ${status} · 投入 ${s.committed.toLocaleString()}${wonPart} · 淨 ${formatNetZh(s.net)}`;
  });
}
