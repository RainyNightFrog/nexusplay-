/**
 * 牌桌 Session HUD 統計：VPIP／PFR／3bet／C-bet／攤牌率等
 * 以單手 actionLog 累加，供點座位查看。
 */

import type { HandSnapshot, PlayerAction, Street } from "./types";

/** 累加器（分子／分母分開，方便百分比） */
export type SeatHudAccum = {
  hands: number;
  vpip: number;
  pfr: number;
  threeBet: number;
  threeBetOpp: number;
  cbet: number;
  cbetOpp: number;
  /** 看到翻牌後有機會進攤牌 */
  sawFlop: number;
  wtsd: number;
  wonAtSd: number;
  foldPreflop: number;
  betRaise: number;
  call: number;
  wonHands: number;
  /** 本桌淨輸贏（結束 stack − 開手 stack 累計） */
  netProfit: number;
};

/** 下發給客戶端的公開 HUD */
export type PublicSeatHud = {
  hands: number;
  vpipPct: number | null;
  pfrPct: number | null;
  threeBetPct: number | null;
  cbetPct: number | null;
  wtsdPct: number | null;
  wonSdPct: number | null;
  foldPfPct: number | null;
  /** Aggression Factor = (bet+raise) / call；無跟注時為 null */
  af: number | null;
  wonHands: number;
  netProfit: number;
};

export function emptyHudAccum(): SeatHudAccum {
  return {
    hands: 0,
    vpip: 0,
    pfr: 0,
    threeBet: 0,
    threeBetOpp: 0,
    cbet: 0,
    cbetOpp: 0,
    sawFlop: 0,
    wtsd: 0,
    wonAtSd: 0,
    foldPreflop: 0,
    betRaise: 0,
    call: 0,
    wonHands: 0,
    netProfit: 0,
  };
}

function pct(num: number, den: number): number | null {
  if (den <= 0) return null;
  return Math.round((num / den) * 1000) / 10;
}

export function toPublicHud(a: SeatHudAccum): PublicSeatHud {
  return {
    hands: a.hands,
    vpipPct: pct(a.vpip, a.hands),
    pfrPct: pct(a.pfr, a.hands),
    threeBetPct: pct(a.threeBet, a.threeBetOpp),
    cbetPct: pct(a.cbet, a.cbetOpp),
    wtsdPct: pct(a.wtsd, a.sawFlop),
    wonSdPct: pct(a.wonAtSd, a.wtsd),
    foldPfPct: pct(a.foldPreflop, a.hands),
    af: a.call > 0 ? Math.round((a.betRaise / a.call) * 100) / 100 : null,
    wonHands: a.wonHands,
    netProfit: a.netProfit,
  };
}

function isAggressive(type: string): boolean {
  return type === "bet" || type === "raise" || type === "all-in";
}

/**
 * 前兩筆 preflop 的 bet／all-in 視為強制盲注（引擎固定先 SB 再 BB）。
 */
export function forcedBlindIndices(log: PlayerAction[]): Set<number> {
  const out = new Set<number>();
  let found = 0;
  for (let i = 0; i < log.length && found < 2; i++) {
    const a = log[i]!;
    if (a.street !== "preflop") break;
    if (a.type === "bet" || a.type === "all-in") {
      out.add(i);
      found += 1;
    }
  }
  return out;
}

export type HandHudDelta = {
  seatId: string;
  vpip: boolean;
  pfr: boolean;
  threeBet: boolean;
  threeBetOpp: boolean;
  cbet: boolean;
  cbetOpp: boolean;
  sawFlop: boolean;
  wtsd: boolean;
  wonAtSd: boolean;
  foldPreflop: boolean;
  betRaise: number;
  call: number;
  won: boolean;
  netDelta: number;
};

/**
 * 從一手完整快照推算每位參與者的 HUD 增量。
 * winners：seatId → 贏得金額；startingStacks 用於淨值。
 */
export function computeHandHudDeltas(
  snap: HandSnapshot,
  winners: Map<string, number> | Record<string, number>,
  startingStacks?: Map<string, number> | Record<string, number>,
): HandHudDelta[] {
  const winGet = (id: string) =>
    winners instanceof Map
      ? (winners.get(id) ?? 0)
      : (winners[id] ?? 0);
  const startGet = (id: string) => {
    if (!startingStacks) return undefined;
    return startingStacks instanceof Map
      ? startingStacks.get(id)
      : startingStacks[id];
  };

  const log = snap.actionLog;
  const blinds = forcedBlindIndices(log);
  const dealt = snap.seats.filter((s) => s.holeCards.length > 0 || s.committed > 0);

  /* —— 翻前加注序列（略過盲注）—— */
  type PfAgg = { seatId: string; index: number };
  const pfRaises: PfAgg[] = [];
  for (let i = 0; i < log.length; i++) {
    const a = log[i]!;
    if (a.street !== "preflop") break;
    if (blinds.has(i)) continue;
    if (a.type === "raise" || a.type === "bet" || a.type === "all-in") {
      /* all-in／bet 在已有投注時視為加注攻擊 */
      if (a.type === "bet" || a.type === "raise" || a.type === "all-in") {
        pfRaises.push({ seatId: a.seatId, index: i });
      }
    }
  }

  const lastPfAggressor =
    pfRaises.length > 0 ? pfRaises[pfRaises.length - 1]!.seatId : null;

  const deltas: HandHudDelta[] = [];

  for (const seat of dealt) {
    const seatId = seat.seatId;
    const myPf = log
      .map((a, i) => ({ a, i }))
      .filter(({ a, i }) => a.street === "preflop" && a.seatId === seatId);

    let vpip = false;
    let pfr = false;
    let foldPreflop = false;
    let threeBet = false;
    let threeBetOpp = false;

    for (const { a, i } of myPf) {
      if (blinds.has(i)) continue;
      if (a.type === "fold") {
        foldPreflop = true;
        continue;
      }
      if (a.type === "call") {
        vpip = true;
        continue;
      }
      if (a.type === "check") continue;
      if (isAggressive(a.type)) {
        vpip = true;
        pfr = true;
        /* 面對至少一次先前加注 → 3bet 機會與執行 */
        const priorRaises = pfRaises.filter((r) => r.index < i).length;
        if (priorRaises >= 1) {
          threeBetOpp = true;
          threeBet = true;
        }
      }
    }

    /* 3bet 機會：輪到你時已有人加注，你卻選擇 fold／call／check */
    if (!threeBetOpp) {
      for (const { a, i } of myPf) {
        if (blinds.has(i)) continue;
        const priorRaises = pfRaises.filter((r) => r.index < i).length;
        if (priorRaises >= 1 && (a.type === "fold" || a.type === "call" || a.type === "check")) {
          threeBetOpp = true;
          break;
        }
      }
    }

    /* 翻牌 C-bet：翻前最後攻擊者，翻牌無人先下注且自己有行動 */
    const flopActions = log.filter(
      (a) => a.street === "flop" && a.seatId === seatId,
    );
    let cbetOpp = false;
    let cbet = false;
    const sawFlop =
      snap.board.length >= 3 &&
      !foldPreflopBeforeFlop(log, seatId, blinds);

    if (sawFlop && lastPfAggressor === seatId && flopActions.length > 0) {
      const firstFlopIdx = log.findIndex(
        (a) => a.street === "flop" && a.seatId === seatId,
      );
      const betBefore = log.some(
        (a, idx) =>
          a.street === "flop" &&
          idx < firstFlopIdx &&
          isAggressive(a.type),
      );
      if (!betBefore) {
        cbetOpp = true;
        cbet = isAggressive(flopActions[0]!.type);
      }
    }

    const survivors = snap.seats.filter((s) => !s.folded);
    const wtsd =
      !seat.folded &&
      snap.board.length >= 3 &&
      survivors.length >= 2;

    const wonAmt = winGet(seatId);
    const won = wonAmt > 0;
    const wonAtSd = wtsd && won;

    let betRaise = 0;
    let call = 0;
    for (let i = 0; i < log.length; i++) {
      const a = log[i]!;
      if (a.seatId !== seatId) continue;
      if (blinds.has(i)) continue;
      if (a.type === "call") call += 1;
      if (a.type === "bet" || a.type === "raise" || a.type === "all-in") {
        betRaise += 1;
      }
    }

    const start = startGet(seatId);
    const netDelta =
      start != null ? seat.stack - start : wonAmt - seat.committed;

    deltas.push({
      seatId,
      vpip,
      pfr,
      threeBet,
      threeBetOpp,
      cbet,
      cbetOpp,
      sawFlop,
      wtsd,
      wonAtSd,
      foldPreflop,
      betRaise,
      call,
      won,
      netDelta,
    });
  }

  return deltas;
}

function foldPreflopBeforeFlop(
  log: PlayerAction[],
  seatId: string,
  blinds: Set<number>,
): boolean {
  for (let i = 0; i < log.length; i++) {
    const a = log[i]!;
    if (a.street !== "preflop") return false;
    if (a.seatId === seatId && a.type === "fold" && !blinds.has(i)) return true;
  }
  return false;
}

export function applyHandDeltas(
  accum: SeatHudAccum,
  d: HandHudDelta,
): SeatHudAccum {
  return {
    hands: accum.hands + 1,
    vpip: accum.vpip + (d.vpip ? 1 : 0),
    pfr: accum.pfr + (d.pfr ? 1 : 0),
    threeBet: accum.threeBet + (d.threeBet ? 1 : 0),
    threeBetOpp: accum.threeBetOpp + (d.threeBetOpp ? 1 : 0),
    cbet: accum.cbet + (d.cbet ? 1 : 0),
    cbetOpp: accum.cbetOpp + (d.cbetOpp ? 1 : 0),
    sawFlop: accum.sawFlop + (d.sawFlop ? 1 : 0),
    wtsd: accum.wtsd + (d.wtsd ? 1 : 0),
    wonAtSd: accum.wonAtSd + (d.wonAtSd ? 1 : 0),
    foldPreflop: accum.foldPreflop + (d.foldPreflop ? 1 : 0),
    betRaise: accum.betRaise + d.betRaise,
    call: accum.call + d.call,
    wonHands: accum.wonHands + (d.won ? 1 : 0),
    netProfit: accum.netProfit + d.netDelta,
  };
}

export function formatHudPct(v: number | null): string {
  if (v == null) return "—";
  return `${v}%`;
}

export function formatHudAf(v: number | null): string {
  if (v == null) return "—";
  return v.toFixed(2);
}

export function formatHudNet(n: number): string {
  if (n > 0) return `+${n.toLocaleString()}`;
  if (n < 0) return n.toLocaleString();
  return "±0";
}

/** 街名（供測試／除錯） */
export function streetOf(a: { street: Street }): Street {
  return a.street;
}
