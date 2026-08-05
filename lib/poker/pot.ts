/**
 * Main Pot / Side Pot / Split Pot 計算器
 *
 * 演算法：
 * 1. 依每位玩家本手 committed 金額分層
 * 2. 由低到高切出每一層「增量」形成獨立底池
 * 3. 僅未蓋牌且貢獻達該層的玩家有資格爭奪
 * 4. 平分時奇數籌碼給座位序較早者（seatIndex 較小）
 */

import type { SidePot } from "./types";

export interface PotContributor {
  seatId: string;
  seatIndex: number;
  /** 本手投入底池總額（含盲注／跟注／加注／all-in） */
  committed: number;
  folded: boolean;
}

export interface PotAward {
  seatId: string;
  amount: number;
  potIndex: number;
}

/**
 * 由貢獻額建立主池 + 邊池。
 * 已蓋牌玩家的籌碼仍留在池中，但不可贏得該池。
 */
export function calculateSidePots(contributors: PotContributor[]): SidePot[] {
  const positive = contributors.filter((c) => c.committed > 0);
  if (positive.length === 0) return [];

  const levels = [
    ...new Set(positive.map((c) => c.committed)),
  ].sort((a, b) => a - b);

  const pots: SidePot[] = [];
  let prev = 0;

  for (const level of levels) {
    const layer = level - prev;
    if (layer <= 0) {
      prev = level;
      continue;
    }

    const contributorsAtLevel = positive.filter((c) => c.committed >= level);
    // 池金額 = 層高 × 有貢獻到此層（含已蓋牌）的人數
    // 注意：committed >= level 的人都付了這一層
    const payers = positive.filter((c) => c.committed >= level);
    // 實際上上一層 prev 到 level：所有 committed > prev 的人都付了部分
    // 標準算法：對每個 level，所有 committed >= level 的人各付 (level - prev)
    const amount = layer * payers.length;

    const eligibleSeatIds = contributorsAtLevel
      .filter((c) => !c.folded)
      .map((c) => c.seatId);

    // 若此層無人未蓋牌可爭（極端：全蓋但有人 all-in 殘留），池仍存在給最後未蓋者
    // 若 eligible 為空，將金額併入下一個有 eligible 的池，或掛給最後一個有貢獻未蓋者
    if (eligibleSeatIds.length === 0) {
      // 延後合併：暫存到下一個 pot；若是最後一層則找任意未蓋牌者
      const anyLive = positive.filter((c) => !c.folded).map((c) => c.seatId);
      if (anyLive.length > 0) {
        pots.push({ amount, eligibleSeatIds: anyLive });
      } else {
        // 理論上不應發生（至少一人未蓋）；保底給最高 committed
        const top = positive.slice().sort((a, b) => b.committed - a.committed)[0];
        if (top) pots.push({ amount, eligibleSeatIds: [top.seatId] });
      }
    } else {
      pots.push({ amount, eligibleSeatIds });
    }

    prev = level;
  }

  // 合併相鄰且 eligible 完全相同的池（可選優化，方便顯示）
  return mergeIdenticalEligibility(pots);
}

function mergeIdenticalEligibility(pots: SidePot[]): SidePot[] {
  if (pots.length <= 1) return pots;
  const merged: SidePot[] = [];
  for (const pot of pots) {
    const last = merged[merged.length - 1];
    const same =
      last &&
      last.eligibleSeatIds.length === pot.eligibleSeatIds.length &&
      last.eligibleSeatIds.every((id) => pot.eligibleSeatIds.includes(id));
    if (same && last) {
      last.amount += pot.amount;
    } else {
      merged.push({
        amount: pot.amount,
        eligibleSeatIds: [...pot.eligibleSeatIds],
      });
    }
  }
  return merged;
}

export function totalPot(pots: SidePot[]): number {
  return pots.reduce((s, p) => s + p.amount, 0);
}

export interface ShowdownContestant {
  seatId: string;
  seatIndex: number;
  /** 牌力分數，愈大愈強 */
  handScore: number;
}

/**
 * 將各邊池派彩給贏家；平手時均分，奇數籌碼給 seatIndex 較小者。
 */
export function awardPots(
  pots: SidePot[],
  contestants: ShowdownContestant[],
): PotAward[] {
  const byId = new Map(contestants.map((c) => [c.seatId, c]));
  const awards: PotAward[] = [];

  pots.forEach((pot, potIndex) => {
    const eligible = pot.eligibleSeatIds
      .map((id) => byId.get(id))
      .filter((c): c is ShowdownContestant => !!c);

    if (eligible.length === 0 || pot.amount <= 0) return;

    const bestScore = Math.max(...eligible.map((c) => c.handScore));
    const winners = eligible
      .filter((c) => c.handScore === bestScore)
      .sort((a, b) => a.seatIndex - b.seatIndex);

    const share = Math.floor(pot.amount / winners.length);
    let remainder = pot.amount - share * winners.length;

    for (const w of winners) {
      let amount = share;
      if (remainder > 0) {
        amount += 1;
        remainder -= 1;
      }
      awards.push({ seatId: w.seatId, amount, potIndex });
    }
  });

  return awards;
}

/**
 * 若只剩一人未蓋牌，整池歸該玩家（無需比牌）。
 */
export function awardUncontestedPot(
  pots: SidePot[],
  winnerSeatId: string,
): PotAward[] {
  return pots.map((pot, potIndex) => ({
    seatId: winnerSeatId,
    amount: pot.amount,
    potIndex,
  }));
}

/** 合併同一座位的多筆派彩 */
export function aggregateAwards(awards: PotAward[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const a of awards) {
    map.set(a.seatId, (map.get(a.seatId) ?? 0) + a.amount);
  }
  return map;
}
